/**
 * Creation Client Page Share policy + inventory projection.
 * Spec: specs/domain/creation-client-share.md
 */
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getCreationServiceApiUrl } from '@/lib/constants';
import { getDb } from '@/lib/db';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  collectionClientSharePolicies,
  creationClientShareProjections,
} from '@/lib/db/schema';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';
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

let schemaReady: Promise<void> | null = null;

/** Idempotent DDL so staging works before a manual migrate run. */
async function ensureClientShareSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.execute(sql.raw(`
CREATE TABLE IF NOT EXISTS collection_client_share_policies (
  platform_project_id text PRIMARY KEY REFERENCES platform_projects(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  allow_public_link boolean NOT NULL DEFAULT false,
  require_password boolean NOT NULL DEFAULT true,
  max_ttl_days integer,
  allow_live_head boolean NOT NULL DEFAULT true,
  allow_email_allowlist boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id text
);
CREATE TABLE IF NOT EXISTS creation_client_share_projections (
  share_id text PRIMARY KEY,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  scene_id text NOT NULL,
  page_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  access_mode text NOT NULL,
  content_mode text NOT NULL,
  label text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creation_client_share_projections_project_idx
  ON creation_client_share_projections (platform_project_id);
`));
    })();
  }
  await schemaReady;
}

export async function getClientSharePolicy(
  platformProjectId: string,
  actor: RequestUser
): Promise<{ ok: true; policy: ClientSharePolicy } | { ok: false; status: 403 | 404 }> {
  await ensureClientShareSchema();
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
  await ensureClientShareSchema();
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
  await ensureClientShareSchema();
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

/** Fan-out revoke to Creation token store (P4). Spec: creation-client-share.md */
async function pushCreationClientShareRevoke(
  platformProjectId: string,
  shareId: string,
  actorUserId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const base = getCreationServiceApiUrl()?.replace(/\/+$/, '');
  if (!base) return { ok: true }; // no Creation URL → projection-only (local/dev)
  const serviceSecret = process.env.PLEXON_SERVICE_SECRET?.trim();
  if (!serviceSecret) {
    return { ok: false, status: 503, error: 'PLEXON_SERVICE_SECRET not configured' };
  }
  const url = `${base}/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId)}/client-shares/${encodeURIComponent(shareId)}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
        [PLEXON_SERVICE_SECRET_HEADER]: serviceSecret,
        'X-Plexon-User-Id': actorUserId,
      },
      cache: 'no-store',
    });
    if (res.ok || res.status === 404) return { ok: true };
    const text = await res.text().catch(() => '');
    return {
      ok: false,
      status: res.status >= 400 && res.status < 600 ? res.status : 502,
      error: text.slice(0, 200) || `Creation revoke failed (${res.status})`,
    };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'Creation revoke failed',
    };
  }
}

export async function revokeClientShareProjection(
  platformProjectId: string,
  shareId: string,
  actor: RequestUser
): Promise<
  { ok: true } | { ok: false; status: 403 | 404 | 502 | 503; error?: string }
> {
  await ensureClientShareSchema();
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const allowed = await userCanManageCollectionLifecycle(actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403 };

  const fanout = await pushCreationClientShareRevoke(platformProjectId, shareId, actor.id);
  if (!fanout.ok) {
    return { ok: false, status: fanout.status === 503 ? 503 : 502, error: fanout.error };
  }

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
  await ensureClientShareSchema();
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
