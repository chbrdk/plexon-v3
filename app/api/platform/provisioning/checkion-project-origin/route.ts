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
  checkionProjectId: z.string().min(1),
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

  const checkionId = parsed.checkionProjectId.trim();

  const existingPlatformId = await findPlatformProjectIdByProductExternal('checkion', checkionId);
  if (existingPlatformId) {
    const existingProject = await getPlatformProjectById(existingPlatformId);
    if (!existingProject) {
      return apiError('Inconsistent platform project binding', API_STATUS.INTERNAL_ERROR);
    }
    // Phase 1: Collection should have both capabilities — repair missing AUDION mirror.
    await ensureBindingPlaceholders(existingPlatformId);
    let audionId = await getExternalProjectId(existingPlatformId, 'audion');
    if (!audionId) {
      try {
        const retry = await syncPlatformProjectToProducts(existingPlatformId, {
          source: 'plexon-checkion-project-origin-idempotent',
          onlyProducts: ['audion'],
        });
        const row = retry.find((r) => r.productId === 'audion');
        if (row?.ok && row.externalProjectId) audionId = row.externalProjectId;
      } catch {
        /* fall through with null audion */
      }
    }
    return platformJson({
      platformProjectId: existingPlatformId,
      audionProjectId: audionId,
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
      productId: 'checkion',
      externalProjectId: checkionId,
      syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
      syncMessage: null,
      lastSyncAt: new Date(),
    });

    // CHECKION already bound; sync AUDION best-effort so Collection prefers both capabilities.
    let audionProjectId: string | null = null;
    try {
      const results = await syncPlatformProjectToProducts(platformProjectId, {
        source: 'plexon-checkion-project-origin',
        onlyProducts: ['audion'],
      });
      const audion = results.find((r) => r.productId === 'audion');
      if (audion?.ok && audion.externalProjectId) {
        audionProjectId = audion.externalProjectId;
      }
    } catch {
      /* AUDION mirror can be repaired via sync later */
    }

    return platformJson(
      {
        platformProjectId,
        audionProjectId,
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
    return handleApiError(e, { context: 'checkion-project-origin' });
  }
}
