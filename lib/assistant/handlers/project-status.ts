import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import {
  buildSummaryCardBlock,
  buildUiLayoutFromBlocks,
  type SummaryCardInput,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { summarizeProjectWorkflow } from '@/lib/assistant/workflows/summarize-project';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleProjectStatusIntent: IntentHandler<'project_status'> = async (ctx) => {
  emitPhase(ctx.emit, 'workflow', 'summarize_project');
  if (!ctx.platformProjectId) {
    return {
      assistantText:
        '## Projekt auswählen\n\nBitte wähle ein Projekt im Kontext-Dropdown für die Statusabfrage.',
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const summary = await summarizeProjectWorkflow(ctx.user, ctx.platformProjectId);
  const assistantText = summary.ok ? (summary.text ?? 'Keine Daten') : `## Fehler\n\n${summary.error ?? 'Fehler'}`;
  const summaryBlock = summary.ok
    ? buildSummaryCardBlock(summary.data as SummaryCardInput)
    : null;
  const metadata = {
    contentType:
      summaryBlock?.ok
        ? ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED
        : ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
    summary: summary.data,
    ...(summaryBlock?.ok
      ? { uiLayout: buildUiLayoutFromBlocks([summaryBlock.block]) }
      : {}),
  };
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'summarize_project' },
  });
  return { assistantText, metadata };
};
