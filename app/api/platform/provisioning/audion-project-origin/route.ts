import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { getCompanyIdsForUser } from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import {
  createPlatformProject,
  deletePlatformProject,
  getPlatformProjectById,
} from '@/lib/db/platform-projects';
import {
  ensureBindingPlaceholders,
  findPlatformProjectIdByProductExternal,
  getExternalProjectId,
  upsertPlatformProjectBinding,
} from '@/lib/db/platform-project-bindings';
import { users } from '@/lib/db/schema';
import { PLATFORM_PROJECT_BINDING_SYNC_STATUS } from '@/lib/platform-companies';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  platformJson,
  readServiceSecret,
} from '@/lib/platform-contract';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';

function checkSecret(request: Request): boolean {
  const serviceSecret = process.env.PLEXON_SERVICE_SECRET ?? '';
  const secret = readServiceSecret(request);
  return Boolean(serviceSecret && secret === serviceSecret);
}

const bodySchema = z.object({
  audionProjectId: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().nullable().optional(),
  ownerPlexonUserId: z.string().min(1),
  platformCompanyId: z.string().min(1),
});

export async function POST(request: Request) {
  if (!checkSecret(request)) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', API_STATUS.UNAVAILABLE);

  const contract = request.headers.get(PLEXON_CONTRACT_VERSION_HEADER)?.trim();
  if (contract !== PLEXON_FEDERATION_CONTRACT_VERSION) {
    return apiError(`Invalid or missing ${PLEXON_CONTRACT_VERSION_HEADER}`, API_STATUS.BAD_REQUEST);
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    parsed = bodySchema.parse(raw);
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.errors.map((x) => x.message).join('; ') : 'Invalid body';
    return apiError(msg, API_STATUS.BAD_REQUEST);
  }

  const ownerId = parsed.ownerPlexonUserId.trim();
  const companyId = parsed.platformCompanyId.trim();
  const audionId = parsed.audionProjectId.trim();

  const db = getDb();
  const [ownerRow] = await db.select({ id: users.id }).from(users).where(eq(users.id, ownerId)).limit(1);
  if (!ownerRow) {
    return apiError('Unknown ownerPlexonUserId', API_STATUS.NOT_FOUND);
  }

  const companyIds = await getCompanyIdsForUser(ownerId);
  if (!companyIds.includes(companyId)) {
    return apiError('ownerPlexonUserId is not a member of platformCompanyId', API_STATUS.FORBIDDEN);
  }

  const existingPlatformId = await findPlatformProjectIdByProductExternal('audion', audionId);
  if (existingPlatformId) {
    const existingProject = await getPlatformProjectById(existingPlatformId);
    if (!existingProject) {
      return apiError('Inconsistent platform project binding', API_STATUS.INTERNAL_ERROR);
    }
    let checkionId = await getExternalProjectId(existingPlatformId, 'checkion');
    if (!checkionId) {
      try {
        const retry = await syncPlatformProjectToProducts(existingPlatformId, {
          source: 'plexon-audion-project-origin-idempotent',
          onlyProducts: ['checkion'],
        });
        const row = retry.find((r) => r.productId === 'checkion');
        if (row?.ok && row.externalProjectId) checkionId = row.externalProjectId;
      } catch {
        /* fall through with null checkion */
      }
    }
    return platformJson({
      platformProjectId: existingPlatformId,
      checkionProjectId: checkionId,
      platformCompanyId: existingProject.companyId,
    });
  }

  const platformProjectId = randomUUID();
  const domain =
    parsed.domain === undefined || parsed.domain === null
      ? null
      : String(parsed.domain).trim() || null;

  try {
    await createPlatformProject({
      id: platformProjectId,
      companyId,
      name: parsed.name,
      domain,
      createdByUserId: ownerId,
    });
    await ensureBindingPlaceholders(platformProjectId);
    await upsertPlatformProjectBinding({
      platformProjectId,
      productId: 'audion',
      externalProjectId: audionId,
      syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
      syncMessage: null,
      lastSyncAt: new Date(),
    });

    const results = await syncPlatformProjectToProducts(platformProjectId, {
      source: 'plexon-audion-project-origin',
      onlyProducts: ['checkion'],
    });
    const checkion = results.find((r) => r.productId === 'checkion');
    if (!checkion?.ok || !checkion.externalProjectId) {
      await deletePlatformProject(platformProjectId);
      return apiError(checkion?.error ?? 'CHECKION project sync failed', 502);
    }

    return platformJson(
      {
        platformProjectId,
        checkionProjectId: checkion.externalProjectId,
        platformCompanyId: companyId,
      },
      { status: 201 }
    );
  } catch (e) {
    try {
      await deletePlatformProject(platformProjectId);
    } catch {
      /* best-effort cleanup */
    }
    return handleApiError(e, { context: 'audion-project-origin' });
  }
}
