import { randomUUID } from 'crypto';
import type { AssistantStreamPhase } from '@/lib/assistant/assistant-sse';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import {
  formatAudionProjectCreatedMessage,
  formatCheckionProjectCreatedMessage,
  formatMissingProjectNameMessage,
} from '@/lib/assistant/format-messages';
import { buildProductCreatedLayout } from '@/lib/assistant/ui-blocks/build-product-created-ui';
import { uiLayoutToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text';
import {
  CREATE_PRODUCT_PROJECT_INITIAL_STEPS,
  metadataWithWorkflowSteps,
} from '@/lib/assistant/ui-blocks/workflow-ui';
import { createAudionProject } from '@/lib/integrations/audion-project-client';
import { createCheckionProject } from '@/lib/integrations/checkion-project-client';
import { pathAudionAdminProject } from '@/lib/paths/audion-api';
import { pathCheckionProject } from '@/lib/paths/checkion-api';
import { createAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';

export type LocalProductCreateInput = {
  product: 'audion' | 'checkion';
  name?: string;
  domain?: string | null;
  conversationId: string;
  userId: string;
  emitPhase?: (phase: AssistantStreamPhase, detail?: string) => void;
};

export type LocalProductCreateOutput = {
  assistantText: string;
  metadata: Record<string, unknown>;
  workflowRunId?: string;
  projectId?: string;
  projectName?: string;
};

async function advanceSteps(
  runId: string,
  steps: WorkflowStep[],
  stepId: string,
  patch: Partial<WorkflowStep>
): Promise<WorkflowStep[]> {
  const next = steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
  await updateAssistantWorkflowRun(runId, { steps: next, status: 'running' });
  return next;
}

export async function handleLocalProductCreate(
  input: LocalProductCreateInput
): Promise<LocalProductCreateOutput> {
  const workflowType =
    input.product === 'audion' ? 'create_audion_project' : 'create_checkion_project';
  input.emitPhase?.('workflow', workflowType);

  if (!input.name?.trim()) {
    return {
      assistantText: formatMissingProjectNameMessage(input.domain),
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: input.conversationId,
    userId: input.userId,
    type: workflowType,
    steps: CREATE_PRODUCT_PROJECT_INITIAL_STEPS.map((s) =>
      s.id === 'validate' ? { ...s, status: 'running' as const } : s
    ),
  });

  let steps = workflowRun.steps;
  steps = await advanceSteps(workflowRun.id, steps, 'validate', { status: 'done' });
  steps = await advanceSteps(workflowRun.id, steps, 'create', { status: 'running' });

  const result =
    input.product === 'audion'
      ? await createAudionProject(input.name)
      : await createCheckionProject(input.name, input.domain);

  if (!result.ok) {
    steps = await advanceSteps(workflowRun.id, steps, 'create', {
      status: 'error',
      detail: result.error,
    });
    const layout = buildProductCreatedLayout({
      product: input.product,
      name: input.name,
      projectId: '—',
      domain: input.domain,
      error: result.error,
    });
    return {
      assistantText: `## Fehler\n\n${result.error}`,
      metadata: metadataWithWorkflowSteps(
        {
          contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
          workflowRunId: workflowRun.id,
          workflowType,
          uiLayout: layout,
        },
        steps
      ),
      workflowRunId: workflowRun.id,
    };
  }

  steps = await advanceSteps(workflowRun.id, steps, 'create', { status: 'done' });
  steps = await advanceSteps(workflowRun.id, steps, 'done', { status: 'done' });
  await updateAssistantWorkflowRun(workflowRun.id, { status: 'completed', steps });

  const layout = buildProductCreatedLayout({
    product: input.product,
    name: result.name,
    projectId: result.id,
    domain: input.product === 'checkion' ? (result as { domain?: string | null }).domain : undefined,
  });

  const markdown =
    input.product === 'audion'
      ? formatAudionProjectCreatedMessage({
          name: result.name,
          audionProjectId: result.id,
          adminHref: pathAudionAdminProject(result.id),
        })
      : formatCheckionProjectCreatedMessage({
          name: result.name,
          checkionProjectId: result.id,
          projectHref: pathCheckionProject(result.id),
          domain: (result as { domain?: string | null }).domain,
        });

  const plainUi = uiLayoutToPlainText(layout);
  const assistantText = plainUi ? `${markdown}\n\n${plainUi}` : markdown;

  return {
    assistantText,
    metadata: metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId: workflowRun.id,
        workflowType,
        uiLayout: layout,
        ...(input.product === 'audion'
          ? { audionProjectId: result.id }
          : { checkionProjectId: result.id }),
      },
      steps
    ),
    workflowRunId: workflowRun.id,
    projectId: result.id,
    projectName: result.name,
  };
}
