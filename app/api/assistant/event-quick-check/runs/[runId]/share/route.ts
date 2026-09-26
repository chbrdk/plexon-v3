import { randomUUID } from 'crypto';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  requireEventQuickCheckRunAccess,
  resolveEqcPlatformProjectId,
} from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import { getRequestUser } from '@/lib/auth-request-user';
import { reportFromWorkflowRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import {
  generateEqcShareToken,
  hashReportShareToken,
} from '@/lib/assistant/reports/share-token';
import { setClientRoomSlot } from '@/lib/collection-client-room';
import { upsertCollectionShareLink } from '@/lib/collection-share-links';
import { pathShareQuickCheck } from '@/lib/constants';
import { createEventQuickCheckShare } from '@/lib/db/event-quick-check-shares';
import { getPublicAppBaseUrl } from '@/lib/mail';

/** Create a public read-only share link (snapshot of current report). */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;
  try {
    const run = await requireEventQuickCheckRunAccess(user, runId);
    const report = reportFromWorkflowRun(run);
    if (!report) return apiError('Report not ready', API_STATUS.BAD_REQUEST);

    const token = generateEqcShareToken();
    const share = await createEventQuickCheckShare({
      id: randomUUID(),
      runId: run.id,
      createdByUserId: user.id,
      shareTokenHash: hashReportShareToken(token),
      reportSnapshot: report,
    });

    const sharePath = pathShareQuickCheck(token);
    const base = getPublicAppBaseUrl();
    const shareUrl = base ? `${base}${sharePath}` : sharePath;
    const title =
      report.meta?.title?.trim() || report.meta?.projectName?.trim() || 'Event Quick Check';

    const platformProjectId = await resolveEqcPlatformProjectId(run);
    if (platformProjectId) {
      await upsertCollectionShareLink({
        platformProjectId,
        productId: 'plexon',
        shareId: share.id,
        kind: 'quick_check',
        title,
        href: shareUrl,
        serviceTrusted: true,
        actor: user,
        meta: { runId: run.id },
      }).catch(() => undefined);

      // ClientRoom slot remains available for later UX reuse.
      await setClientRoomSlot({
        platformProjectId,
        actor: user,
        slotId: 'quick_check',
        serviceTrusted: true,
        slot: {
          productId: 'plexon',
          subjectRef: share.id,
          title,
          href: shareUrl,
        },
      }).catch(() => undefined);
    }

    return Response.json({
      id: share.id,
      token,
      url: sharePath,
      createdAt: share.createdAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return apiError('Not found', API_STATUS.NOT_FOUND);
    }
    throw e;
  }
}
