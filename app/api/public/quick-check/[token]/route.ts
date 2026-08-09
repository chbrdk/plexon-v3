import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getEventQuickCheckShareByTokenHash } from '@/lib/db/event-quick-check-shares';
import { hashReportShareToken } from '@/lib/assistant/reports/share-token';

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

  return Response.json({
    id: share.id,
    runId: share.runId,
    report: share.reportSnapshot,
    createdAt: share.createdAt.toISOString(),
  });
}
