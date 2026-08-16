import { randomUUID } from 'crypto';
import { z } from 'zod';

import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
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
import { PLATFORM_PROJECT_BINDING_SYNC_STATUS } from '@/lib/platform-companies';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  platformJson,
  readServiceSecret,
} from '@/lib/platform-contract';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import { resolveProductOriginOwner } from '@/lib/resolve-product-origin-owner';

function checkSecret(request: Request): boolean {
  const serviceSecret = process.env.PLEXON_SERVICE_SECRET ?? '';
  const secret = readServiceSecret(request);
  return Boolean(serviceSecret && secret === serviceSecret);
}

const bodySchema = z.object({
  audionProjectId: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().nullable().optional(),
  /** Optional — Plexon auto-resolves / bootstraps when omitted (service secret). */
  ownerPlexonUserId: z.string().min(1).optional(),
  platformCompanyId: z.string().min(1).optional(),
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

  let ownerId: string;
  let companyId: string;
  try {
    const resolved = await resolveProductOriginOwner({
      ownerPlexonUserId: parsed.ownerPlexonUserId,
      platformCompanyId: parsed.platformCompanyId,
    });
    ownerId = resolved.ownerPlexonUserId;
    companyId = resolved.platformCompanyId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not resolve owner/company';
    if (msg.includes('Unknown')) return apiError(msg, API_STATUS.NOT_FOUND);
    if (msg.includes('not a member')) return apiError(msg, API_STATUS.FORBIDDEN);
    return apiError(msg, API_STATUS.BAD_REQUEST);
  }

  const audionId = parsed.audionProjectId.trim();

  const existingPlatformId = await findPlatformProjectIdByProductExternal('audion', audionId);
  if (existingPlatformId) {
    const existingProject = await getPlatformProjectById(existingPlatformId);
    if (!existingProject) {
      return apiError('Inconsistent platform project binding', API_STATUS.INTERNAL_ERROR);
    }
    // Phase 1: Collection must have sibling capabilities — repair missing CHECKION/BRANDION mirrors.
    await ensureBindingPlaceholders(existingPlatformId);
    let checkionId = await getExternalProjectId(existingPlatformId, 'checkion');
    let brandionId = await getExternalProjectId(existingPlatformId, 'brandion');
    let creationId = await getExternalProjectId(existingPlatformId, 'creation');
    let spirionId = await getExternalProjectId(existingPlatformId, 'spirion');
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
    if (!brandionId) {
      try {
        const retry = await syncPlatformProjectToProducts(existingPlatformId, {
          source: 'plexon-audion-project-origin-idempotent',
          onlyProducts: ['brandion'],
        });
        const row = retry.find((r) => r.productId === 'brandion');
        if (row?.ok && row.externalProjectId) brandionId = row.externalProjectId;
      } catch {
        /* fall through with null brandion */
      }
    }
    if (!creationId) {
      try {
        const retry = await syncPlatformProjectToProducts(existingPlatformId, {
          source: 'plexon-audion-project-origin-idempotent',
          onlyProducts: ['creation'],
        });
        const row = retry.find((r) => r.productId === 'creation');
        if (row?.ok && row.externalProjectId) creationId = row.externalProjectId;
      } catch {
        /* fall through with null creation */
      }
    }
    if (!spirionId) {
      try {
        const retry = await syncPlatformProjectToProducts(existingPlatformId, {
          source: 'plexon-audion-project-origin-idempotent',
          onlyProducts: ['spirion'],
        });
        const row = retry.find((r) => r.productId === 'spirion');
        if (row?.ok && row.externalProjectId) spirionId = row.externalProjectId;
      } catch {
        /* fall through with null spirion */
      }
    }
    return platformJson({
      platformProjectId: existingPlatformId,
      checkionProjectId: checkionId,
      brandionProjectId: brandionId,
      creationProjectId: creationId,
      spirionProjectId: spirionId,
      platformCompanyId: existingProject.companyId,
      ownerPlexonUserId: ownerId,
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

    // AUDION already bound; sync CHECKION so Collection end-state has both capabilities.
    const results = await syncPlatformProjectToProducts(platformProjectId, {
      source: 'plexon-audion-project-origin',
      onlyProducts: ['checkion'],
    });
    const checkion = results.find((r) => r.productId === 'checkion');
    if (!checkion?.ok || !checkion.externalProjectId) {
      await deletePlatformProject(platformProjectId);
      return apiError(checkion?.error ?? 'CHECKION project sync failed', 502);
    }

    let brandionProjectId: string | null = null;
    let creationProjectId: string | null = null;
    let spirionProjectId: string | null = null;
    try {
      const brandionResults = await syncPlatformProjectToProducts(platformProjectId, {
        source: 'plexon-audion-project-origin',
        onlyProducts: ['brandion'],
      });
      const brandion = brandionResults.find((r) => r.productId === 'brandion');
      if (brandion?.ok && brandion.externalProjectId) {
        brandionProjectId = brandion.externalProjectId;
      }
    } catch {
      /* BRANDION mirror can be repaired via sync later */
    }
    try {
      const creationResults = await syncPlatformProjectToProducts(platformProjectId, {
        source: 'plexon-audion-project-origin',
        onlyProducts: ['creation'],
      });
      const creation = creationResults.find((r) => r.productId === 'creation');
      if (creation?.ok && creation.externalProjectId) {
        creationProjectId = creation.externalProjectId;
      }
    } catch {
      /* CREATION mirror can be repaired via sync later */
    }
    try {
      const spirionResults = await syncPlatformProjectToProducts(platformProjectId, {
        source: 'plexon-audion-project-origin',
        onlyProducts: ['spirion'],
      });
      const spirion = spirionResults.find((r) => r.productId === 'spirion');
      if (spirion?.ok && spirion.externalProjectId) {
        spirionProjectId = spirion.externalProjectId;
      }
    } catch {
      /* SPIRION mirror can be repaired via sync later */
    }

    return platformJson(
      {
        platformProjectId,
        checkionProjectId: checkion.externalProjectId,
        brandionProjectId,
        creationProjectId,
        spirionProjectId,
        platformCompanyId: companyId,
        ownerPlexonUserId: ownerId,
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
