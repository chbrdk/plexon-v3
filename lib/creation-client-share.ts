/**
 * Creation Client Page Share policy + inventory projection.
 * Spec: specs/domain/creation-client-share.md
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  collectionClientSharePolicies,
  creationClientShareProjections,
} from '@/lib/db/schema';
import { userCanManageCollectionLifecycle, userCanViewPlatformProject } from '@/lib/platform-project-access';
import type { RequestUser } from '@/lib/auth-request-user';

export type ClientSharePolicy = {
  enabled: boolean;
  allowPublicLink: boolean;
  requirePassword: boolean;
  maxTtlDays: number | null;
  allowLiveHead: boolean;
  allowEmailAllowlist: boolean;
};

export const DEFAULT_CLIENT_SHARE_POLICY: ClientSharePolicy = {
  enabled: true,
  allowPublicLink: false,
  requirePassword: true,
  maxTtlDays: 30,
  allowLiveHead: true,
  allowEmailAllowlist: true,
};

export async function getClientSharePolicy(
  platformProjectId: string,
  actor: RequestUser
): Promise<{ ok: true; policy: ClientSharePolicy } | { ok: false; status: 403 | 404 }> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const canView = await userCanViewPlatformProject(actor.id, actor.role, platformProjectId);
  if (!canView) return { ok: false, status: 403 };

  const db = getDb();
  const rows = await db
    .select()
    .from(collectionClientSharePolicies)
    .where(eq(collectionClientSharePolicies.platformProjectId, platformProjectId))
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: true, policy: { ...DEFAULT_CLIENT_SHARE_POLICY } };
  return {
    ok: true,
    policy: {
      enabled: row.enabled,
      allowPublicLink: row.allowPublicLink,
      requirePassword: row.requirePassword,
      maxTtlDays: row.maxTtlDays,
      allowLiveHead: row.allowLiveHead,
      allowEmailAllowlist: row.allowEmailAllowlist,
    },
  };
}

export async function patchClientSharePolicy(
  platformProjectId: string,
  actor: RequestUser,
  patch: Partial<ClientSharePolicy>
): Promise<
  { ok: true; policy: ClientSharePolicy } | { ok: false; status: 403 | 404 | 400; error?: string }
> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const allowed = await userCanManageCollectionLifecycle(actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403 };

  const current = await getClientSharePolicy(platformProjectId, actor);
  if (!current.ok) return current;
  const next: ClientSharePolicy = {
    ...current.policy,
    ...(typeof patch.enabled === 'boolean' ? { enabled: patch.enabled } : {}),
    ...(typeof patch.allowPublicLink === 'boolean'
      ? { allowPublicLink: patch.allowPublicLink }
      : {}),
    ...(typeof patch.requirePassword === 'boolean'
      ? { requirePassword: patch.requirePassword }
      : {}),
    ...(patch.maxTtlDays === null ||
    (typeof patch.maxTtlDays === 'number' && patch.maxTtlDays > 0)
      ? { maxTtlDays: patch.maxTtlDays }
      : {}),
    ...(typeof patch.allowLiveHead === 'boolean' ? { allowLiveHead: patch.allowLiveHead } : {}),
    ...(typeof patch.allowEmailAllowlist === 'boolean'
      ? { allowEmailAllowlist: patch.allowEmailAllowlist }
      : {}),
  };

  const db = getDb();
  await db
    .insert(collectionClientSharePolicies)
    .values({
      platformProjectId,
      enabled: next.enabled,
      allowPublicLink: next.allowPublicLink,
      requirePassword: next.requirePassword,
      maxTtlDays: next.maxTtlDays,
      allowLiveHead: next.allowLiveHead,
      allowEmailAllowlist: next.allowEmailAllowlist,
      updatedAt: new Date(),
      updatedByUserId: actor.id,
    })
    .onConflictDoUpdate({
      target: collectionClientSharePolicies.platformProjectId,
      set: {
        enabled: next.enabled,
        allowPublicLink: next.allowPublicLink,
        requirePassword: next.requirePassword,
        maxTtlDays: next.maxTtlDays,
        allowLiveHead: next.allowLiveHead,
        allowEmailAllowlist: next.allowEmailAllowlist,
        updatedAt: new Date(),
        updatedByUserId: actor.id,
      },
    });

  return { ok: true, policy: next };
}

export type ClientShareProjectionInput = {
  shareId: string;
  sceneId: string;
  pageIds: string[];
  accessMode: string;
  contentMode: string;
  label?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string | null;
};

export async function upsertClientShareProjection(
  platformProjectId: string,
  actor: RequestUser,
  input: ClientShareProjectionInput
): Promise<{ ok: true } | { ok: false; status: 403 | 404 | 400; error?: string }> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const allowed = await userCanManageCollectionLifecycle(actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403 };
  if (!input.shareId?.trim() || !input.sceneId?.trim()) {
    return { ok: false, status: 400, error: 'shareId and sceneId required' };
  }

  const db = getDb();
  const now = new Date();
  await db
    .insert(creationClientShareProjections)
    .values({
      shareId: input.shareId.trim(),
      platformProjectId,
      sceneId: input.sceneId.trim(),
      pageIds: Array.isArray(input.pageIds) ? input.pageIds : [],
      accessMode: input.accessMode || 'password',
      contentMode: input.contentMode || 'pinned_revision',
      label: input.label ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      revokedAt: input.revokedAt ? new Date(input.revokedAt) : null,
      createdAt: input.createdAt ? new Date(input.createdAt) : now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: creationClientShareProjections.shareId,
      set: {
        sceneId: input.sceneId.trim(),
        pageIds: Array.isArray(input.pageIds) ? input.pageIds : [],
        accessMode: input.accessMode || 'password',
        contentMode: input.contentMode || 'pinned_revision',
        label: input.label ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        revokedAt: input.revokedAt ? new Date(input.revokedAt) : null,
        updatedAt: now,
      },
    });
  return { ok: true };
}

export async function revokeClientShareProjection(
  platformProjectId: string,
  shareId: string,
  actor: RequestUser
): Promise<{ ok: true } | { ok: false; status: 403 | 404 }> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const allowed = await userCanManageCollectionLifecycle(actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403 };

  const db = getDb();
  const now = new Date();
  await db
    .update(creationClientShareProjections)
    .set({ revokedAt: now, updatedAt: now })
    .where(
      and(
        eq(creationClientShareProjections.shareId, shareId),
        eq(creationClientShareProjections.platformProjectId, platformProjectId),
        isNull(creationClientShareProjections.revokedAt)
      )
    );
  return { ok: true };
}

export async function listClientShareProjections(
  platformProjectId: string,
  actor: RequestUser
): Promise<
  | {
      ok: true;
      items: Array<{
        shareId: string;
        sceneId: string;
        pageIds: string[];
        accessMode: string;
        contentMode: string;
        label: string | null;
        expiresAt: string | null;
        revokedAt: string | null;
        createdAt: string;
      }>;
    }
  | { ok: false; status: 403 | 404 }
> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const canView = await userCanViewPlatformProject(actor.id, actor.role, platformProjectId);
  if (!canView) return { ok: false, status: 403 };

  const db = getDb();
  const rows = await db
    .select()
    .from(creationClientShareProjections)
    .where(eq(creationClientShareProjections.platformProjectId, platformProjectId))
    .orderBy(desc(creationClientShareProjections.createdAt));

  return {
    ok: true,
    items: rows.map((r) => ({
      shareId: r.shareId,
      sceneId: r.sceneId,
      pageIds: r.pageIds ?? [],
      accessMode: r.accessMode,
      contentMode: r.contentMode,
      label: r.label,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
