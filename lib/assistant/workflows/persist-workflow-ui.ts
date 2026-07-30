import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import {
  listAssistantMessagesForConversation,
  updateAssistantMessageMetadata,
} from '@/lib/db/assistant-messages';
import { getAssistantWorkflowRunById } from '@/lib/db/assistant-workflow-runs';
import { metadataWithWorkflowSteps } from '@/lib/assistant/ui-blocks/workflow-ui';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export async function findAssistantMessageByWorkflowRunId(
  conversationId: string,
  workflowRunId: string
) {
  const messages = await listAssistantMessagesForConversation(conversationId);
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const meta = messages[i].metadata;
    if (isRecord(meta) && meta.workflowRunId === workflowRunId) {
      return messages[i];
    }
  }
  return null;
}

export async function persistWorkflowStepsToMessage(
  workflowRunId: string,
  steps: WorkflowStep[]
): Promise<void> {
  const run = await getAssistantWorkflowRunById(workflowRunId);
  if (!run) return;

  const message = await findAssistantMessageByWorkflowRunId(run.conversationId, workflowRunId);
  if (!message) return;

  const base = isRecord(message.metadata) ? message.metadata : {};
  const nextMetadata = metadataWithWorkflowSteps(base, steps);

  await updateAssistantMessageMetadata(message.id, nextMetadata);
}
