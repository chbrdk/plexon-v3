import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { renderAssistantReportPptxDebugPlan } from '@/lib/assistant/reports/render-assistant-report-pptx-debug';
import { renderAssistantReportPptx } from '@/lib/assistant/reports/render-assistant-report-pptx';
import { getSharedReportByTokenHash } from '@/lib/db/assistant-shared-reports';
import { hashReportShareToken } from '@/lib/assistant/reports/share-token';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { isAssistantReportPptxDebugPlanRequest } from '@/lib/paths/assistant-report-export';

export async function GET(
  request: Request,
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

  const input = {
    title: report.title,
    uiLayout: report.uiLayout as UiLayout,
  };

  if (isAssistantReportPptxDebugPlanRequest(request.url)) {
    const debug = await renderAssistantReportPptxDebugPlan(input);
    if (!debug.ok) {
      return apiError(debug.error, 503);
    }
    return Response.json(debug.debug, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  }

  const rendered = await renderAssistantReportPptx(input);

  if (!rendered.ok) {
    return apiError(rendered.error, 503);
  }

  return new Response(new Uint8Array(rendered.pptx), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${rendered.filename}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
