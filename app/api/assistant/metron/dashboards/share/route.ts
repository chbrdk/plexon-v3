import { randomUUID } from 'crypto';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { parseMetronDashboardShareSnapshot } from '@/lib/assistant/metron-share-snapshot';
import {
  generateMetronShareToken,
  hashReportShareToken,
} from '@/lib/assistant/reports/share-token';
import { upsertCollectionShareLink } from '@/lib/collection-share-links';
import { createMetronDashboardShare } from '@/lib/db/metron-dashboard-shares';
import { getPublicAppBaseUrl } from '@/lib/mail';
import { pathShareMetron } from '@/lib/constants';

/** Create a public read-only METRON dashboard share link (snapshot). */
export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  const snapshot = parseMetronDashboardShareSnapshot(
    body && typeof body === 'object' && 'snapshot' in body
      ? (body as { snapshot: unknown }).snapshot
      : body,
  );
  if (!snapshot) {
    return apiError('Invalid snapshot', API_STATUS.BAD_REQUEST);
  }
  if (!snapshot.metrics.length && !snapshot.chart) {
    return apiError('Snapshot has no metrics or chart', API_STATUS.BAD_REQUEST);
  }

  const token = generateMetronShareToken();
  const share = await createMetronDashboardShare({
    id: randomUUID(),
    createdByUserId: user.id,
    platformProjectId: snapshot.platformProjectId,
    dashboardId: snapshot.dashboardId,
    shareTokenHash: hashReportShareToken(token),
    reportSnapshot: snapshot,
  });

  const sharePath = pathShareMetron(token);
  const base = getPublicAppBaseUrl();
  const shareUrl = base ? `${base}${sharePath}` : sharePath;
  const platformProjectId = snapshot.platformProjectId?.trim();
  if (platformProjectId) {
    await upsertCollectionShareLink({
      platformProjectId,
      productId: 'metron',
      shareId: share.id,
      kind: 'dashboard',
      title: snapshot.name?.trim() || snapshot.dashboardId || 'Dashboard',
      href: shareUrl,
      serviceTrusted: true,
      actor: user,
      meta: { dashboardId: snapshot.dashboardId, source: 'assistant' },
    }).catch(() => undefined);
  }

  return Response.json({
    id: share.id,
    token,
    url: sharePath,
    createdAt: share.createdAt.toISOString(),
  });
}
