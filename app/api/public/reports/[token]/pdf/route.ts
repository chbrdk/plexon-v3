import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { renderAssistantReportPdf } from '@/lib/assistant/reports/render-assistant-report-pdf';
import { getSharedReportByTokenHash } from '@/lib/db/assistant-shared-reports';
import { hashReportShareToken } from '@/lib/assistant/reports/share-token';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { token } = await ctx.params;
  const plain = token?.trim() ?? '';
  if (!plain.startsWith('rpt_') || plain.length < 20) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const report = await getSharedReportByTokenHash(hashReportShareToken(plain));
  if (!report || !report.isPublic) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const rendered = await renderAssistantReportPdf({
    title: report.title,
    uiLayout: report.uiLayout as UiLayout,
  });

  if (!rendered.ok) {
    return apiError(rendered.error, 503);
  }

  return new Response(new Uint8Array(rendered.pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${rendered.filename}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
