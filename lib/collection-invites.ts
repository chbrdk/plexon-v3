/**
 * Collection invite persistence + accept.
 * Spec: specs/domain/collection-invite-links.md
 */

import { randomUUID } from 'crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { getCompanyIdsForUser } from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { collectionInvites } from '@/lib/db/schema';
import { upsertUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';
import {
  generateCollectionInviteToken,
  hashCollectionInviteToken,
} from '@/lib/collection-invite-token';
import {
  buildCreationInviteRedirectUrl,
  resolvePublicAppBaseUrl,
} from '@/lib/collection-invite-redirect';
import {
  pathCollectionInvite,
} from '@/lib/constants';
import { getCreationUrl } from '@/lib/constants';
import {
  PLATFORM_PROJECT_ASSIGNMENT_ROLE,
  type PlatformProjectAssignmentRole,
} from '@/lib/platform-provisioning';
import { userCanManageCollectionLifecycle } from '@/lib/platform-project-access';
import { isAdmin, type RequestUser } from '@/lib/auth-request-user';

export type CollectionInviteRecord = {
  id: string;
  platformProjectId: string;
  createdByUserId: string;
  role: PlatformProjectAssignmentRole;
  sceneId: string | null;
  expiresAt: Date;
  maxUses: number | null;
  useCount: number;
  revokedAt: Date | null;
  createdAt: Date;
};

const DEFAULT_EXPIRES_DAYS = 7;
const MAX_EXPIRES_DAYS = 30;

function mapRow(row: typeof collectionInvites.$inferSelect): CollectionInviteRecord {
  return {
    id: row.id,
    platformProjectId: row.platformProjectId,
    createdByUserId: row.createdByUserId,
    role: row.role as PlatformProjectAssignmentRole,
    sceneId: row.sceneId,
    expiresAt: row.expiresAt,
    maxUses: row.maxUses,
    useCount: row.useCount,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

function parseRole(value: unknown): PlatformProjectAssignmentRole {
  if (value === PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN) {
    return PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN;
  }
  return PLATFORM_PROJECT_ASSIGNMENT_ROLE.MEMBER;
}

export type CreateCollectionInviteInput = {
  platformProjectId: string;
  createdBy: RequestUser;
  role?: unknown;
  sceneId?: unknown;
  expiresInDays?: unknown;
  maxUses?: unknown;
};

export type CreateCollectionInviteResult =
  | {
      ok: true;
      inviteId: string;
      inviteUrl: string;
      role: PlatformProjectAssignmentRole;
      sceneId: string | null;
      expiresAt: string;
      maxUses: number | null;
    }
  | { ok: false; status: 403 | 404 | 400; error: string };

export async function createCollectionInvite(
  input: CreateCollectionInviteInput
): Promise<CreateCollectionInviteResult> {
  const platformProjectId = input.platformProjectId.trim();
  if (!platformProjectId) return { ok: false, status: 400, error: 'Invalid project id' };

  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404, error: 'Not found' };

  const allowed = await userCanManageCollectionLifecycle(input.createdBy, platformProjectId);
  if (!allowed) return { ok: false, status: 403, error: 'Forbidden' };

  let expiresInDays = DEFAULT_EXPIRES_DAYS;
  if (typeof input.expiresInDays === 'number' && Number.isFinite(input.expiresInDays)) {
    expiresInDays = Math.min(MAX_EXPIRES_DAYS, Math.max(1, Math.floor(input.expiresInDays)));
  }

  let maxUses: number | null = null;
  if (input.maxUses !== undefined && input.maxUses !== null) {
    if (typeof input.maxUses !== 'number' || !Number.isFinite(input.maxUses) || input.maxUses < 1) {
      return { ok: false, status: 400, error: 'Invalid maxUses' };
    }
    maxUses = Math.floor(input.maxUses);
  }

  const sceneId =
    typeof input.sceneId === 'string' && input.sceneId.trim() ? input.sceneId.trim() : null;
  const role = parseRole(input.role);
  const plain = generateCollectionInviteToken();
  const tokenHash = hashCollectionInviteToken(plain);
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  const db = getDb();
  await db.insert(collectionInvites).values({
    id,
    platformProjectId,
    createdByUserId: input.createdBy.id,
    tokenHash,
    role,
    sceneId,
    expiresAt,
    maxUses,
    useCount: 0,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const appBase = resolvePublicAppBaseUrl();
  const inviteUrl = appBase
    ? `${appBase}${pathCollectionInvite(plain)}`
    : pathCollectionInvite(plain);

  return {
    ok: true,
    inviteId: id,
    inviteUrl,
    role,
    sceneId,
    expiresAt: expiresAt.toISOString(),
    maxUses,
  };
}

export async function listCollectionInvites(
  platformProjectId: string,
  actor: RequestUser
): Promise<{ ok: true; items: CollectionInviteRecord[] } | { ok: false; status: 403 | 404 }> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const allowed = await userCanManageCollectionLifecycle(actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403 };

  const db = getDb();
  const rows = await db
    .select()
    .from(collectionInvites)
    .where(
      and(
        eq(collectionInvites.platformProjectId, platformProjectId),
        isNull(collectionInvites.revokedAt)
      )
    )
    .orderBy(desc(collectionInvites.createdAt));

  return { ok: true, items: rows.map(mapRow) };
}

export async function revokeCollectionInvite(
  platformProjectId: string,
  inviteId: string,
  actor: RequestUser
): Promise<{ ok: true } | { ok: false; status: 403 | 404 }> {
  const allowed = await userCanManageCollectionLifecycle(actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403 };

  const db = getDb();
  const [row] = await db
    .select()
    .from(collectionInvites)
    .where(
      and(
        eq(collectionInvites.id, inviteId),
        eq(collectionInvites.platformProjectId, platformProjectId)
      )
    )
    .limit(1);
  if (!row) return { ok: false, status: 404 };

  const now = new Date();
  await db
    .update(collectionInvites)
    .set({ revokedAt: now, updatedAt: now })
    .where(eq(collectionInvites.id, inviteId));
  return { ok: true };
}

export type AcceptCollectionInviteResult =
  | {
      ok: true;
      platformProjectId: string;
      role: PlatformProjectAssignmentRole;
      redirectUrl: string | null;
    }
  | { ok: false; status: 403 | 404 | 410; error: string };

export async function acceptCollectionInvite(
  plainToken: string,
  invitee: RequestUser
): Promise<AcceptCollectionInviteResult> {
  const token = plainToken.trim();
  if (!token) return { ok: false, status: 404, error: 'Not found' };

  const db = getDb();
  const tokenHash = hashCollectionInviteToken(token);
  const [row] = await db
    .select()
    .from(collectionInvites)
    .where(eq(collectionInvites.tokenHash, tokenHash))
    .limit(1);
  if (!row) return { ok: false, status: 404, error: 'Not found' };

  if (row.revokedAt) return { ok: false, status: 410, error: 'Invite revoked' };
  if (row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 410, error: 'Invite expired' };
  }
  if (row.maxUses != null && row.useCount >= row.maxUses) {
    return { ok: false, status: 410, error: 'Invite exhausted' };
  }

  const project = await getPlatformProjectById(row.platformProjectId);
  if (!project) return { ok: false, status: 404, error: 'Not found' };

  if (!isAdmin(invitee)) {
    const companyIds = await getCompanyIdsForUser(invitee.id);
    if (!companyIds.includes(project.companyId)) {
      return { ok: false, status: 403, error: 'Wrong company' };
    }
  }

  const role = parseRole(row.role);
  await upsertUserPlatformProjectAssignment(invitee.id, row.platformProjectId, role);

  const now = new Date();
  await db
    .update(collectionInvites)
    .set({ useCount: row.useCount + 1, updatedAt: now })
    .where(eq(collectionInvites.id, row.id));

  const creationBase = getCreationUrl()?.replace(/\/+$/, '') ?? '';
  const redirectUrl = creationBase
    ? buildCreationInviteRedirectUrl(creationBase, {
        platformProjectId: row.platformProjectId,
        sceneId: row.sceneId,
      })
    : null;

  return {
    ok: true,
    platformProjectId: row.platformProjectId,
    role,
    redirectUrl: redirectUrl || null,
  };
}
