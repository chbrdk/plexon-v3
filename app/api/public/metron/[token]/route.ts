import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { hashReportShareToken } from '@/lib/assistant/reports/share-token';
import { getMetronDashboardShareByTokenHash } from '@/lib/db/metron-dashboard-shares';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { token } = await ctx.params;
  const plain = token?.trim() ?? '';
  if (!plain.startsWith('mtn_') || plain.length < 20) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const share = await getMetronDashboardShareByTokenHash(hashReportShareToken(plain));
  if (!share) return apiError('Not found', API_STATUS.NOT_FOUND);

  return Response.json({
    id: share.id,
    dashboardId: share.dashboardId,
    report: share.reportSnapshot,
    createdAt: share.createdAt.toISOString(),
  });
}
