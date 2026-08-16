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
    // Phase 1: Collection should have sibling capabilities — repair missing AUDION/BRANDION mirrors.
    await ensureBindingPlaceholders(existingPlatformId);
    let audionId = await getExternalProjectId(existingPlatformId, 'audion');
    let brandionId = await getExternalProjectId(existingPlatformId, 'brandion');
    let creationId = await getExternalProjectId(existingPlatformId, 'creation');
    let spirionId = await getExternalProjectId(existingPlatformId, 'spirion');
    const missing: Array<'audion' | 'brandion' | 'creation' | 'spirion'> = [];
    if (!audionId) missing.push('audion');
    if (!brandionId) missing.push('brandion');
    if (!creationId) missing.push('creation');
    if (!spirionId) missing.push('spirion');
    if (missing.length > 0) {
      try {
        const retry = await syncPlatformProjectToProducts(existingPlatformId, {
          source: 'plexon-checkion-project-origin-idempotent',
          onlyProducts: missing,
        });
        const audionRow = retry.find((r) => r.productId === 'audion');
        const brandionRow = retry.find((r) => r.productId === 'brandion');
        const creationRow = retry.find((r) => r.productId === 'creation');
        const spirionRow = retry.find((r) => r.productId === 'spirion');
        if (audionRow?.ok && audionRow.externalProjectId) audionId = audionRow.externalProjectId;
        if (brandionRow?.ok && brandionRow.externalProjectId) {
          brandionId = brandionRow.externalProjectId;
        }
        if (creationRow?.ok && creationRow.externalProjectId) {
          creationId = creationRow.externalProjectId;
        }
        if (spirionRow?.ok && spirionRow.externalProjectId) spirionId = spirionRow.externalProjectId;
      } catch {
        /* fall through with null mirrors */
      }
    }
    return platformJson({
      platformProjectId: existingPlatformId,
      audionProjectId: audionId,
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
      productId: 'checkion',
      externalProjectId: checkionId,
      syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
      syncMessage: null,
      lastSyncAt: new Date(),
    });

    // CHECKION already bound; sync AUDION + BRANDION + CREATION + SPIRION best-effort.
    let audionProjectId: string | null = null;
    let brandionProjectId: string | null = null;
    let creationProjectId: string | null = null;
    let spirionProjectId: string | null = null;
    try {
      const results = await syncPlatformProjectToProducts(platformProjectId, {
        source: 'plexon-checkion-project-origin',
        onlyProducts: ['audion', 'brandion', 'creation', 'spirion'],
      });
      const audion = results.find((r) => r.productId === 'audion');
      const brandion = results.find((r) => r.productId === 'brandion');
      const creation = results.find((r) => r.productId === 'creation');
      const spirion = results.find((r) => r.productId === 'spirion');
      if (audion?.ok && audion.externalProjectId) {
        audionProjectId = audion.externalProjectId;
      }
      if (brandion?.ok && brandion.externalProjectId) {
        brandionProjectId = brandion.externalProjectId;
      }
      if (creation?.ok && creation.externalProjectId) {
        creationProjectId = creation.externalProjectId;
      }
      if (spirion?.ok && spirion.externalProjectId) {
        spirionProjectId = spirion.externalProjectId;
      }
    } catch {
      /* sibling mirrors can be repaired via sync later */
    }

    return platformJson(
      {
        platformProjectId,
        audionProjectId,
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
    return handleApiError(e, { context: 'checkion-project-origin' });
  }
}
