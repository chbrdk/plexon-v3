import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getSharedReportByTokenHash } from '@/lib/db/assistant-shared-reports';
import { hashReportShareToken } from '@/lib/assistant/reports/share-token';

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

  return Response.json({
    id: report.id,
    title: report.title,
    narrative: report.narrative,
    uiLayout: report.uiLayout,
    createdAt: report.createdAt,
  });
}
