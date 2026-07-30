import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { getAssistantWorkflowRunById } from '@/lib/db/assistant-workflow-runs';
import {
  buildWorkflowStepListBlock,
  workflowStepListTitle,
} from '@/lib/assistant/ui-blocks/workflow-ui';
import { persistWorkflowStepsToMessage } from '@/lib/assistant/workflows/persist-workflow-ui';

export type WorkflowStreamPayload = {
  id: string;
  status: string;
  steps: WorkflowStep[];
  workflowType?: string;
  result?: Record<string, unknown> | null;
};

export type WorkflowStreamHandlers = {
  onWorkflow?: (payload: WorkflowStreamPayload) => void;
  onUiBlockUpdate?: (block: ReturnType<typeof buildWorkflowStepListBlock>) => void;
  onDone?: (status: string) => void;
};

export function encodeWorkflowUiBlockUpdateEvent(block: ReturnType<typeof buildWorkflowStepListBlock>) {
  return JSON.stringify({
    type: 'ui_block_update',
    block: { id: block.id, type: block.type, props: block.props },
  });
}

export async function buildWorkflowStreamPayload(
  runId: string
): Promise<WorkflowStreamPayload | null> {
  const current = await getAssistantWorkflowRunById(runId);
  if (!current) return null;
  return {
    id: current.id,
    status: current.status,
    steps: current.steps,
    workflowType: current.type,
    result: current.result,
  };
}

export async function emitWorkflowStreamEvents(
  send: (event: string, data: unknown) => void,
  payload: WorkflowStreamPayload
) {
  send('workflow', payload);

  const block = buildWorkflowStepListBlock(
    payload.steps,
    workflowStepListTitle(payload.workflowType)
  );
  send('ui_block_update', {
    type: 'ui_block_update',
    block: { id: block.id, type: block.type, props: block.props },
  });

  if (payload.status === 'completed' || payload.status === 'failed') {
    await persistWorkflowStepsToMessage(payload.id, payload.steps);
    send('done', { status: payload.status });
  }
}
