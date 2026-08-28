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
import { PLATFORM_PROJECT_ASSIGNMENT_ROLE } from '@/lib/platform-provisioning';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import { resolveProductOriginOwner } from '@/lib/resolve-product-origin-owner';
import { upsertUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';
import type { PlatformProductId } from '@/lib/platform-entitlements';

function checkSecret(request: Request): boolean {
  const serviceSecret = process.env.PLEXON_SERVICE_SECRET ?? '';
  const secret = readServiceSecret(request);
  return Boolean(serviceSecret && secret === serviceSecret);
}

/** Accept canonical `spirionProjectId` or legacy `digProjectId` for one release. */
const bodySchema = z
  .object({
    spirionProjectId: z.string().min(1).optional(),
    digProjectId: z.string().min(1).optional(),
    name: z.string().min(1),
    domain: z.string().nullable().optional(),
    /** Optional — Plexon auto-resolves / bootstraps when omitted (service secret). */
    ownerPlexonUserId: z.string().min(1).optional(),
    platformCompanyId: z.string().min(1).optional(),
  })
  .refine((b) => Boolean(b.spirionProjectId?.trim() || b.digProjectId?.trim()), {
    message: 'spirionProjectId or digProjectId is required',
    path: ['spirionProjectId'],
  });

async function bestEffortSiblingMirrors(
  platformProjectId: string,
  source: string
): Promise<{
  checkionProjectId: string | null;
  audionProjectId: string | null;
  brandionProjectId: string | null;
  creationProjectId: string | null;
}> {
  let checkionId = await getExternalProjectId(platformProjectId, 'checkion');
  let audionId = await getExternalProjectId(platformProjectId, 'audion');
  let brandionId = await getExternalProjectId(platformProjectId, 'brandion');
  let creationId = await getExternalProjectId(platformProjectId, 'creation');
  const missing: PlatformProductId[] = [];
  if (!checkionId) missing.push('checkion');
  if (!audionId) missing.push('audion');
  if (!brandionId) missing.push('brandion');
  if (!creationId) missing.push('creation');
  if (missing.length === 0) {
    return {
      checkionProjectId: checkionId,
      audionProjectId: audionId,
      brandionProjectId: brandionId,
      creationProjectId: creationId,
    };
  }
  try {
    const results = await syncPlatformProjectToProducts(platformProjectId, {
      source,
      onlyProducts: missing,
    });
    const checkion = results.find((r) => r.productId === 'checkion');
    const audion = results.find((r) => r.productId === 'audion');
    const brandion = results.find((r) => r.productId === 'brandion');
    const creation = results.find((r) => r.productId === 'creation');
    if (checkion?.ok && checkion.externalProjectId) checkionId = checkion.externalProjectId;
    if (audion?.ok && audion.externalProjectId) audionId = audion.externalProjectId;
    if (brandion?.ok && brandion.externalProjectId) brandionId = brandion.externalProjectId;
    if (creation?.ok && creation.externalProjectId) creationId = creation.externalProjectId;
  } catch {
    /* sibling mirrors can be repaired via sync later */
  }
  return {
    checkionProjectId: checkionId,
    audionProjectId: audionId,
    brandionProjectId: brandionId,
    creationProjectId: creationId,
  };
}

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

  const spirionId = (parsed.spirionProjectId ?? parsed.digProjectId)!.trim();

  const existingPlatformId = await findPlatformProjectIdByProductExternal('spirion', spirionId);
  if (existingPlatformId) {
    const existingProject = await getPlatformProjectById(existingPlatformId);
    if (!existingProject) {
      return apiError('Inconsistent platform project binding', API_STATUS.INTERNAL_ERROR);
    }
    await ensureBindingPlaceholders(existingPlatformId);
    const siblings = await bestEffortSiblingMirrors(
      existingPlatformId,
      'plexon-spirion-project-origin-idempotent'
    );
    return platformJson({
      platformProjectId: existingPlatformId,
      checkionProjectId: siblings.checkionProjectId,
      audionProjectId: siblings.audionProjectId,
      brandionProjectId: siblings.brandionProjectId,
      creationProjectId: siblings.creationProjectId,
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
    await upsertUserPlatformProjectAssignment(
      ownerId,
      platformProjectId,
      PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN
    );
    await upsertPlatformProjectBinding({
      platformProjectId,
      productId: 'spirion',
      externalProjectId: spirionId,
      syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
      syncMessage: null,
      lastSyncAt: new Date(),
    });

    const siblings = await bestEffortSiblingMirrors(
      platformProjectId,
      'plexon-spirion-project-origin'
    );

    return platformJson(
      {
        platformProjectId,
        checkionProjectId: siblings.checkionProjectId,
        audionProjectId: siblings.audionProjectId,
        brandionProjectId: siblings.brandionProjectId,
        creationProjectId: siblings.creationProjectId,
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
    return handleApiError(e, { context: 'spirion-project-origin' });
  }
}
