import { eq } from 'drizzle-orm';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isPlatformProductId, type PlatformProductId } from '@/lib/platform-entitlements';
import { syncUserProductProvisioning } from '@/lib/platform-provisioning-service';
import { getPlatformProductDefinitions } from '@/lib/platform-products';

type ProvisioningActionMode = 'retry' | 'resync';

function getManageableProductIds() {
  return new Set(
    getPlatformProductDefinitions()
      .filter((product) => product.id !== 'plexon')
      .map((product) => product.id)
  );
}

async function ensureUserExists(userId: string) {
  const db = getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

function isProvisioningActionMode(value: unknown): value is ProvisioningActionMode {
  return value === 'retry' || value === 'resync';
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { id } = await ctx.params;
  const user = await ensureUserExists(id);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  const mode = body.mode ?? 'retry';
  if (!isProvisioningActionMode(mode)) {
    return apiError('Invalid provisioning mode', API_STATUS.BAD_REQUEST);
  }

  const manageableProductIds = getManageableProductIds();
  let productIds: PlatformProductId[] | undefined;
  if (body.productIds !== undefined) {
    if (!Array.isArray(body.productIds)) {
      return apiError('productIds must be an array', API_STATUS.BAD_REQUEST);
    }
    const seen = new Set<string>();
    productIds = [];
    for (const rawProductId of body.productIds) {
      if (!isPlatformProductId(rawProductId) || !manageableProductIds.has(rawProductId)) {
        return apiError('Invalid productId', API_STATUS.BAD_REQUEST);
      }
      if (seen.has(rawProductId)) {
        return apiError('Duplicate productId in provisioning payload', API_STATUS.BAD_REQUEST);
      }
      seen.add(rawProductId);
      productIds.push(rawProductId);
    }
  }

  const items = await syncUserProductProvisioning(id, {
    force: true,
    productIds,
    source: mode === 'retry' ? 'plexon-admin-retry' : 'plexon-admin-resync',
  });

  return Response.json({
    userId: id,
    mode,
    items: items.map((item) => ({
      productId: item.productId,
      desiredState: item.desiredState,
      syncStatus: item.syncStatus,
      syncMessage: item.syncMessage,
      lastAttemptAt: item.lastAttemptAt?.toISOString() ?? null,
      lastSucceededAt: item.lastSucceededAt?.toISOString() ?? null,
      externalUserRef: item.externalUserRef,
    })),
  });
}
