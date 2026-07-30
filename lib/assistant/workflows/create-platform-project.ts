import { randomUUID } from 'crypto';
import type { RequestUser } from '@/lib/auth-request-user';
import {
  listUserCompanies,
  resolveDefaultCompanyId,
  userCanCreatePlatformProject,
} from '@/lib/assistant/user-eligibility';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { createPlatformProject } from '@/lib/db/platform-projects';
import { ensureBindingPlaceholders } from '@/lib/db/platform-project-bindings';
import { upsertUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';
import { PLATFORM_PROJECT_ASSIGNMENT_ROLE } from '@/lib/platform-provisioning';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import { pathPlatformProjectDashboard } from '@/lib/constants';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';

export type CreatePlatformProjectInput = {
  name: string;
  domain?: string | null;
  companyId?: string | null;
  syncProducts?: boolean;
};

export type CreatePlatformProjectResult = {
  ok: boolean;
  platformProjectId?: string;
  dashboardPath?: string;
  syncResults?: Array<{ productId: string; ok: boolean; externalProjectId?: string | null; error?: string }>;
  error?: string;
  missing?: Array<'name' | 'companyId'>;
  companyOptions?: Array<{ id: string; name: string }>;
};

async function setStep(
  runId: string | undefined,
  steps: WorkflowStep[],
  stepId: string,
  patch: Partial<WorkflowStep>
): Promise<WorkflowStep[]> {
  const next = steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
  if (runId) {
    await updateAssistantWorkflowRun(runId, { steps: next, status: 'running' });
  }
  return next;
}

export async function createPlatformProjectWorkflow(
  user: RequestUser,
  input: CreatePlatformProjectInput,
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<{ result: CreatePlatformProjectResult; steps: WorkflowStep[] }> {
  let steps: WorkflowStep[] = options.initialSteps ?? [
    { id: 'validate', label: 'Eingaben prüfen', status: 'running' },
    { id: 'create', label: 'Plattform-Projekt anlegen', status: 'pending' },
    { id: 'assign', label: 'Zugriff setzen', status: 'pending' },
    { id: 'sync', label: 'CHECKION & AUDION synchronisieren', status: 'pending' },
  ];
  const runId = options.workflowRunId;

  const name = input.name?.trim();
  if (!name) {
    steps = await setStep(runId, steps, 'validate', { status: 'error', detail: 'Projektname fehlt' });
    return {
      result: { ok: false, error: 'Projektname fehlt', missing: ['name'] },
      steps,
    };
  }

  let companyId = input.companyId?.trim() || null;
  const companies = await listUserCompanies(user.id);
  if (!companyId) {
    companyId = await resolveDefaultCompanyId(user.id);
  }
  if (!companyId) {
    steps = await setStep(runId, steps, 'validate', {
      status: 'error',
      detail: 'Keine Organisation zugeordnet',
    });
    return {
      result: {
        ok: false,
        error: 'Keine Organisation zugeordnet',
        missing: ['companyId'],
        companyOptions: companies,
      },
      steps,
    };
  }

  if (companies.length > 1 && !input.companyId) {
    const match = companies.find((c) => c.id === companyId);
    if (!match) {
      steps = await setStep(runId, steps, 'validate', {
        status: 'error',
        detail: 'Bitte Organisation wählen',
      });
      return {
        result: {
          ok: false,
          error: 'Bitte Organisation angeben',
          missing: ['companyId'],
          companyOptions: companies,
        },
        steps,
      };
    }
  }

  const allowed = await userCanCreatePlatformProject(user, companyId);
  if (!allowed) {
    steps = await setStep(runId, steps, 'validate', {
      status: 'error',
      detail: 'Keine Berechtigung oder kein Produkt-Entitlement',
    });
    return {
      result: { ok: false, error: 'Keine Berechtigung für Projektanlage in dieser Organisation' },
      steps,
    };
  }

  steps = await setStep(runId, steps, 'validate', { status: 'done' });
  steps = await setStep(runId, steps, 'create', { status: 'running' });

  const platformProjectId = randomUUID();
  try {
    await createPlatformProject({
      id: platformProjectId,
      companyId,
      name,
      domain: input.domain ?? null,
      createdByUserId: user.id,
    });
    await ensureBindingPlaceholders(platformProjectId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Anlage fehlgeschlagen';
    steps = await setStep(runId, steps, 'create', { status: 'error', detail: message });
    return { result: { ok: false, error: message }, steps };
  }

  steps = await setStep(runId, steps, 'create', { status: 'done', detail: platformProjectId });
  steps = await setStep(runId, steps, 'assign', { status: 'running' });

  try {
    await upsertUserPlatformProjectAssignment(
      user.id,
      platformProjectId,
      PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN
    );
    steps = await setStep(runId, steps, 'assign', { status: 'done' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Zuweisung fehlgeschlagen';
    steps = await setStep(runId, steps, 'assign', { status: 'error', detail: message });
    return {
      result: { ok: false, platformProjectId, error: message, dashboardPath: pathPlatformProjectDashboard(platformProjectId) },
      steps,
    };
  }

  let syncResults: CreatePlatformProjectResult['syncResults'];
  if (input.syncProducts !== false) {
    steps = await setStep(runId, steps, 'sync', { status: 'running' });
    try {
      const results = await syncPlatformProjectToProducts(platformProjectId, {
        source: 'plexon-assistant-create',
      });
      syncResults = results.map((r) => ({
        productId: r.productId,
        ok: r.ok,
        externalProjectId: r.externalProjectId ?? null,
        error: r.error,
      }));
      const allOk = results.every((r) => r.ok);
      steps = await setStep(runId, steps, 'sync', {
        status: allOk ? 'done' : 'error',
        detail: allOk ? undefined : 'Teilweise fehlgeschlagen',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync fehlgeschlagen';
      steps = await setStep(runId, steps, 'sync', { status: 'error', detail: message });
      return {
        result: {
          ok: true,
          platformProjectId,
          dashboardPath: pathPlatformProjectDashboard(platformProjectId),
          syncResults,
          error: message,
        },
        steps,
      };
    }
  } else {
    steps = await setStep(runId, steps, 'sync', { status: 'done', detail: 'Übersprungen' });
  }

  if (runId) {
    await updateAssistantWorkflowRun(runId, {
      status: 'completed',
      steps,
      result: { platformProjectId, syncResults },
    });
  }

  return {
    result: {
      ok: true,
      platformProjectId,
      dashboardPath: pathPlatformProjectDashboard(platformProjectId),
      syncResults,
    },
    steps,
  };
}

export async function getProjectBindingIds(platformProjectId: string): Promise<{
  checkionProjectId: string | null;
  audionProjectId: string | null;
}> {
  const bindings = await getBindingsForPlatformProject(platformProjectId);
  const checkion = bindings.find((b) => b.productId === 'checkion');
  const audion = bindings.find((b) => b.productId === 'audion');
  return {
    checkionProjectId: checkion?.externalProjectId ?? null,
    audionProjectId: audion?.externalProjectId ?? null,
  };
}
