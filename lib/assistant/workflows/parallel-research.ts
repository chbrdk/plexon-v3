import type { RequestUser } from '@/lib/auth-request-user';
import { getProjectBindingIds } from '@/lib/assistant/workflows/create-platform-project';
import { startCheckionProjectResearch } from '@/lib/integrations/checkion-research-client';
import {
  pollAudionProjectResearch,
  startAudionProjectResearch,
  fetchAudionProjectResearchLatest,
} from '@/lib/integrations/audion-research-client';
import {
  updateAssistantWorkflowRun,
  type WorkflowStep,
} from '@/lib/db/assistant-workflow-runs';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 5 * 60 * 1000;

async function setStep(
  runId: string,
  steps: WorkflowStep[],
  stepId: string,
  patch: Partial<WorkflowStep>
): Promise<WorkflowStep[]> {
  const next = steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
  await updateAssistantWorkflowRun(runId, { steps: next, status: 'running' });
  return next;
}

export async function runParallelResearchWorkflow(input: {
  runId: string;
  user: RequestUser;
  platformProjectId: string;
  domain?: string | null;
}): Promise<void> {
  const { runId, user, platformProjectId, domain } = input;
  let steps: WorkflowStep[] = [
    { id: 'bindings', label: 'Produkt-IDs laden', status: 'running' },
    { id: 'checkion_research', label: 'CHECKION Research', status: 'pending' },
    { id: 'audion_research', label: 'AUDION Research', status: 'pending' },
  ];

  const { checkionProjectId, audionProjectId } = await getProjectBindingIds(platformProjectId);
  if (!checkionProjectId && !audionProjectId) {
    steps = await setStep(runId, steps, 'bindings', {
      status: 'error',
      detail: 'Keine CHECKION/AUDION Bindings',
    });
    await updateAssistantWorkflowRun(runId, {
      status: 'failed',
      steps,
      result: { error: 'Keine Produkt-Bindings gefunden. Bitte zuerst synchronisieren.' },
    });
    return;
  }

  steps = await setStep(runId, steps, 'bindings', {
    status: 'done',
    detail: [
      checkionProjectId ? `CHECKION: ${checkionProjectId}` : null,
      audionProjectId ? `AUDION: ${audionProjectId}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  });

  const seedUrl = domain?.trim()
    ? domain.startsWith('http')
      ? domain
      : `https://${domain}`
    : undefined;

  const researchResults: Record<string, unknown> = {};

  if (checkionProjectId) {
    steps = await setStep(runId, steps, 'checkion_research', { status: 'running', progress: 10 });
    const checkion = await startCheckionProjectResearch(checkionProjectId, user.id, {
      url: seedUrl,
    });
    if (checkion.ok) {
      researchResults.checkion = checkion.data;
      steps = await setStep(runId, steps, 'checkion_research', { status: 'done', progress: 100 });
    } else {
      steps = await setStep(runId, steps, 'checkion_research', {
        status: 'error',
        detail: checkion.error,
      });
      researchResults.checkionError = checkion.error;
    }
  } else {
    steps = await setStep(runId, steps, 'checkion_research', {
      status: 'done',
      detail: 'Kein CHECKION-Projekt',
    });
  }

  if (audionProjectId) {
    steps = await setStep(runId, steps, 'audion_research', { status: 'running', progress: 5 });
    const started = await startAudionProjectResearch(audionProjectId, user.id, {
      seedUrl,
    });
    if (!started.ok || !started.runId) {
      steps = await setStep(runId, steps, 'audion_research', {
        status: 'error',
        detail: started.error ?? 'Start fehlgeschlagen',
      });
      researchResults.audionError = started.error;
    } else {
      const deadline = Date.now() + MAX_POLL_MS;
      let done = false;
      while (Date.now() < deadline) {
        const poll = await pollAudionProjectResearch(audionProjectId, started.runId, user.id);
        if (!poll.ok) {
          steps = await setStep(runId, steps, 'audion_research', {
            status: 'error',
            detail: poll.error,
          });
          researchResults.audionError = poll.error;
          done = true;
          break;
        }
        const progress = poll.progress ?? (poll.status === 'completed' ? 100 : 30);
        steps = await setStep(runId, steps, 'audion_research', {
          status: poll.status === 'completed' || poll.status === 'failed' ? 'done' : 'running',
          progress,
          detail: poll.status,
        });
        if (poll.status === 'completed' || poll.status === 'failed') {
          const latest = await fetchAudionProjectResearchLatest(audionProjectId, user.id);
          researchResults.audion = latest.summary;
          if (poll.status === 'failed') {
            steps = await setStep(runId, steps, 'audion_research', { status: 'error', detail: 'failed' });
          } else {
            steps = await setStep(runId, steps, 'audion_research', { status: 'done', progress: 100 });
          }
          done = true;
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!done) {
        steps = await setStep(runId, steps, 'audion_research', {
          status: 'error',
          detail: 'Timeout – Research läuft noch im Hintergrund',
        });
        researchResults.audionError = 'timeout';
      }
    }
  } else {
    steps = await setStep(runId, steps, 'audion_research', {
      status: 'done',
      detail: 'Kein AUDION-Projekt',
    });
  }

  const failed = steps.some((s) => s.status === 'error');
  await updateAssistantWorkflowRun(runId, {
    status: failed ? 'failed' : 'completed',
    steps,
    result: researchResults,
  });
}
