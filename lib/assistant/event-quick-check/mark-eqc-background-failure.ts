import {
  getAssistantWorkflowRunById,
  updateAssistantWorkflowRun,
} from '@/lib/db/assistant-workflow-runs';

/** Persist a hard failure when background EQC execute throws after HTTP 202. */
export async function markEventQuickCheckBackgroundFailure(
  workflowRunId: string,
  error: unknown,
  logLabel: string
): Promise<void> {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unbekannter Fehler';
  console.error(`[event-quick-check ${logLabel}]`, error);
  try {
    const run = await getAssistantWorkflowRunById(workflowRunId);
    const prior = (run?.result ?? {}) as Record<string, unknown>;
    await updateAssistantWorkflowRun(workflowRunId, {
      status: 'failed',
      result: {
        ...prior,
        error: message,
      },
    });
  } catch (persistError) {
    console.error(`[event-quick-check ${logLabel}] failed to persist error`, persistError);
  }
}
