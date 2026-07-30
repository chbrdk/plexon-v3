import type { WorkflowRunStatus, WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { AssistantStreamEvent } from '@/lib/assistant/assistant-sse';
import {
  buildWorkflowStepListBlock,
  workflowStepListTitle,
} from '@/lib/assistant/ui-blocks/workflow-ui';

export type WorkflowStepEmitter = (event: AssistantStreamEvent) => void;

export function emitWorkflowStepsToStream(
  emit: WorkflowStepEmitter | undefined,
  steps: WorkflowStep[],
  workflowType?: string,
  title?: string
): void {
  if (!emit) return;
  const block = buildWorkflowStepListBlock(
    steps,
    title ?? workflowStepListTitle(workflowType)
  );
  emit({
    type: 'ui_block_update',
    block: { id: block.id, type: block.type, props: block.props },
    index: 0,
  });
}

export function emitWorkflowRunStarted(
  emit: WorkflowStepEmitter | undefined,
  workflowRunId: string,
  workflowType: string
): void {
  emit?.({ type: 'workflow_run', workflowRunId, workflowType });
}

export async function patchWorkflowSteps(input: {
  runId?: string;
  steps: WorkflowStep[];
  stepId: string;
  patch: Partial<WorkflowStep>;
  emit?: WorkflowStepEmitter;
  workflowType?: string;
  title?: string;
  runStatus?: WorkflowRunStatus;
}): Promise<WorkflowStep[]> {
  const next = input.steps.map((s) => (s.id === input.stepId ? { ...s, ...input.patch } : s));
  if (input.runId) {
    await updateAssistantWorkflowRun(input.runId, {
      steps: next,
      status: input.runStatus ?? 'running',
    });
  }
  emitWorkflowStepsToStream(input.emit, next, input.workflowType, input.title);
  return next;
}
