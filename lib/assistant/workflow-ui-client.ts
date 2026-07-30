import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import {
  buildWorkflowStepListBlock,
  metadataWithWorkflowSteps,
  upsertStepListInLayout,
  workflowStepListTitle,
} from '@/lib/assistant/ui-blocks/workflow-ui';
import type { AssistantChatMessage } from '@/components/assistant/AssistantMessageList';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function workflowStepsToUiBlockUpdate(
  steps: WorkflowStep[],
  workflowType?: string
): UiBlock {
  return buildWorkflowStepListBlock(steps, workflowStepListTitle(workflowType));
}

export function applyWorkflowStepsToMessages(
  messages: AssistantChatMessage[],
  workflowRunId: string,
  steps: WorkflowStep[],
  workflowType?: string
): AssistantChatMessage[] {
  const idx = findWorkflowMessageIndex(messages, workflowRunId);
  if (idx < 0) return messages;

  return messages.map((m, i) => {
    if (i !== idx) return m;
    const base = isRecord(m.metadata) ? m.metadata : {};
    const type =
      workflowType ?? (typeof base.workflowType === 'string' ? base.workflowType : undefined);
    return {
      ...m,
      metadata: metadataWithWorkflowSteps(base, steps, workflowStepListTitle(type)),
    };
  });
}

export function findWorkflowMessageIndex(
  messages: AssistantChatMessage[],
  workflowRunId: string
): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const meta = messages[i].metadata;
    if (isRecord(meta) && meta.workflowRunId === workflowRunId) {
      return i;
    }
  }
  return -1;
}

export { upsertStepListInLayout };
