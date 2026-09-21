/**
 * Collection members roster (Access Model B).
 * Spec: specs/api/collection-members.md · transactional-email.md
 */

import { eq, sql } from 'drizzle-orm';
import { isAdmin, type RequestUser } from '@/lib/auth-request-user';
import { pathPlatformProjectDashboard } from '@/lib/constants';
import { getCompanyIdsForUser } from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { users } from '@/lib/db/schema';
import {
  deleteUserPlatformProjectAssignment,
  getUserPlatformProjectAssignment,
  listAssignmentsForPlatformProject,
  upsertUserPlatformProjectAssignment,
} from '@/lib/db/user-platform-project-assignments';
import { getPublicAppBaseUrl, sendTransactionalEmail } from '@/lib/mail';
import {
  userCanManageCollectionLifecycle,
  userCanViewPlatformProject,
} from '@/lib/platform-project-access';
import {
  PLATFORM_PROJECT_ASSIGNMENT_ROLE,
  type PlatformProjectAssignmentRole,
} from '@/lib/platform-provisioning';

export type CollectionMemberSource = 'creator' | 'assignment';

export type CollectionMemberItem = {
  userId: string;
  email: string;
  name: string | null;
  role: PlatformProjectAssignmentRole;
  source: CollectionMemberSource;
};

function parseRole(value: unknown): PlatformProjectAssignmentRole {
  if (value === PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN) {
    return PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN;
  }
  return PLATFORM_PROJECT_ASSIGNMENT_ROLE.MEMBER;
}

async function loadUserPublic(userId: string): Promise<{
  id: string;
  email: string;
  name: string | null;
} | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

async function findUserByEmail(
  email: string
): Promise<{ id: string; email: string; name: string | null } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const db = getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  return row ?? null;
}

function collectionLaunchUrl(platformProjectId: string): string {
  const base = getPublicAppBaseUrl();
  const path = pathPlatformProjectDashboard(platformProjectId);
  return base ? `${base}${path}` : path;
}

export async function listCollectionMembers(
  platformProjectId: string,
  actor: RequestUser
): Promise<
  | { ok: true; items: CollectionMemberItem[] }
  | { ok: false; status: 403 | 404; error: string }
> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404, error: 'Not found' };

  const canView = await userCanViewPlatformProject(actor.id, actor.role, platformProjectId);
  if (!canView) return { ok: false, status: 403, error: 'Forbidden' };

  const byId = new Map<string, CollectionMemberItem>();

  if (project.createdByUserId) {
    const creator = await loadUserPublic(project.createdByUserId);
    if (creator) {
      byId.set(creator.id, {
        userId: creator.id,
        email: creator.email,
        name: creator.name,
        role: PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN,
        source: 'creator',
      });
    }
  }

  const assignments = await listAssignmentsForPlatformProject(platformProjectId);
  for (const row of assignments) {
    if (byId.has(row.userId)) continue;
    const user = await loadUserPublic(row.userId);
    if (!user) continue;
    byId.set(user.id, {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: row.role,
      source: 'assignment',
    });
  }

  return { ok: true, items: [...byId.values()] };
}

export type AddCollectionMemberResult =
  | {
      ok: true;
      status: 'added' | 'already_member';
      userId: string;
      email: string;
      role: PlatformProjectAssignmentRole;
    }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function addCollectionMemberByEmail(input: {
  platformProjectId: string;
  actor: RequestUser;
  email: unknown;
  role?: unknown;
}): Promise<AddCollectionMemberResult> {
  const platformProjectId = input.platformProjectId.trim();
  if (!platformProjectId) return { ok: false, status: 400, error: 'Invalid project id' };

  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404, error: 'Not found' };

  const allowed = await userCanManageCollectionLifecycle(input.actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403, error: 'Forbidden' };

  const emailRaw = typeof input.email === 'string' ? input.email.trim() : '';
  if (!emailRaw || !emailRaw.includes('@')) {
    return { ok: false, status: 400, error: 'Invalid email' };
  }

  const user = await findUserByEmail(emailRaw);
  if (!user) return { ok: false, status: 404, error: 'user_not_found' };

  if (!isAdmin(input.actor)) {
    const companyIds = await getCompanyIdsForUser(user.id);
    if (!companyIds.includes(project.companyId)) {
      return { ok: false, status: 403, error: 'wrong_company' };
    }
  }

  const requestedRole = parseRole(input.role);
  const existing = await getUserPlatformProjectAssignment(user.id, platformProjectId);
  if (existing) {
    return {
      ok: true,
      status: 'already_member',
      userId: user.id,
      email: user.email,
      role: existing.role,
    };
  }

  await upsertUserPlatformProjectAssignment(user.id, platformProjectId, requestedRole);

  const actorPublic = await loadUserPublic(input.actor.id);
  void sendTransactionalEmail({
    kind: 'collection_member_added',
    to: user.email,
    payload: {
      collectionName: project.name || 'Collection',
      role: requestedRole,
      launchUrl: collectionLaunchUrl(platformProjectId),
      actorName: actorPublic?.name || actorPublic?.email || undefined,
    },
  });

  return {
    ok: true,
    status: 'added',
    userId: user.id,
    email: user.email,
    role: requestedRole,
  };
}

export type RevokeCollectionMemberResult =
  | { ok: true }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function revokeCollectionMember(input: {
  platformProjectId: string;
  userId: string;
  actor: RequestUser;
}): Promise<RevokeCollectionMemberResult> {
  const platformProjectId = input.platformProjectId.trim();
  const userId = input.userId.trim();
  if (!platformProjectId || !userId) {
    return { ok: false, status: 400, error: 'Invalid id' };
  }

  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404, error: 'Not found' };

  const allowed = await userCanManageCollectionLifecycle(input.actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403, error: 'Forbidden' };

  if (project.createdByUserId === userId) {
    return { ok: false, status: 400, error: 'creator_immutable' };
  }

  const removed = await deleteUserPlatformProjectAssignment(userId, platformProjectId);
  if (!removed) return { ok: false, status: 404, error: 'Not found' };
  return { ok: true };
}
