import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getEventQuickCheckShareByTokenHash } from '@/lib/db/event-quick-check-shares';
import { hashReportShareToken } from '@/lib/assistant/reports/share-token';
import { buildEventQuickCheckReportBlock } from '@/lib/assistant/reports/build-event-quick-check-report-block';
import { renderAssistantReportPptx } from '@/lib/assistant/reports/render-assistant-report-pptx';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { token } = await ctx.params;
  const plain = token?.trim() ?? '';
  if (!plain.startsWith('eqc_') || plain.length < 20) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const share = await getEventQuickCheckShareByTokenHash(hashReportShareToken(plain));
  if (!share) return apiError('Not found', API_STATUS.NOT_FOUND);

  const report = share.reportSnapshot;
  const block = buildEventQuickCheckReportBlock(report);
  if (!block.ok) return apiError(block.error, API_STATUS.INTERNAL_ERROR);

  const rendered = await renderAssistantReportPptx({
    title: report.meta.title,
    uiLayout: { version: UI_LAYOUT_VERSION, blocks: [block.block] },
    locale: 'de',
  });

  if (!rendered.ok) return apiError(rendered.error, API_STATUS.INTERNAL_ERROR);

  return new Response(new Uint8Array(rendered.pptx), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${rendered.filename}"`,
    },
  });
}
