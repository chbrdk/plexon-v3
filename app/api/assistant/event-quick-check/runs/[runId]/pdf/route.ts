import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { reportFromWorkflowRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { buildEventQuickCheckReportBlock } from '@/lib/assistant/reports/build-event-quick-check-report-block';
import { renderAssistantReportPdf } from '@/lib/assistant/reports/render-assistant-report-pdf';
import { getAssistantWorkflowRunById } from '@/lib/db/assistant-workflow-runs';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const { runId } = await ctx.params;
  const run = await getAssistantWorkflowRunById(runId);
  if (!run || run.userId !== user.id) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const report = reportFromWorkflowRun(run);
  if (!report) return apiError('Report not ready', API_STATUS.NOT_FOUND);

  const block = buildEventQuickCheckReportBlock(report);
  if (!block.ok) return apiError(block.error, API_STATUS.INTERNAL_ERROR);

  const rendered = await renderAssistantReportPdf({
    title: report.meta.title,
    uiLayout: { version: UI_LAYOUT_VERSION, blocks: [block.block] },
    locale: 'de',
  });

  if (!rendered.ok) return apiError(rendered.error, API_STATUS.INTERNAL_ERROR);

  return new Response(new Uint8Array(rendered.pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${rendered.filename}"`,
    },
  });
}
