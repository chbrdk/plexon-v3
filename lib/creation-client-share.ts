/**
 * Creation Client Page Share policy + inventory projection.
 * Spec: specs/domain/creation-client-share.md
 */
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { getCreationServiceApiUrl } from '@/lib/constants';
import { getDb } from '@/lib/db';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  collectionClientSharePolicies,
  companyClientSharePolicies,
  creationClientShareEvents,
  creationClientShareProjections,
} from '@/lib/db/schema';
import { getCompanyById } from '@/lib/db/companies';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';
import { userCanManageCollectionLifecycle, userCanViewPlatformProject } from '@/lib/platform-project-access';
import type { RequestUser } from '@/lib/auth-request-user';
import {
  DEFAULT_CLIENT_SHARE_POLICY,
  collectionPolicyLoosensCompany,
  mergeClientSharePolicy,
  type ClientSharePolicy,
} from '@/lib/client-share-policy-merge';

export type { ClientSharePolicy };
export {
  DEFAULT_CLIENT_SHARE_POLICY,
  collectionPolicyLoosensCompany,
  mergeClientSharePolicy,
};

let schemaReady: Promise<void> | null = null;

/** Idempotent DDL so staging works before a manual migrate run. */
async function ensureClientShareSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.execute(sql.raw(`
CREATE TABLE IF NOT EXISTS company_client_share_policies (
  company_id text PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  allow_public_link boolean NOT NULL DEFAULT false,
  require_password boolean NOT NULL DEFAULT true,
  max_ttl_days integer,
  allow_live_head boolean NOT NULL DEFAULT true,
  allow_email_allowlist boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id text
);
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
CREATE TABLE IF NOT EXISTS creation_client_share_events (
  id text PRIMARY KEY,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  share_id text NOT NULL,
  event_type text NOT NULL,
  actor_user_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creation_client_share_events_project_created_idx
  ON creation_client_share_events (platform_project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS creation_client_share_events_share_created_idx
  ON creation_client_share_events (share_id, created_at DESC);
`));
    })();
  }
  await schemaReady;
}

function policyFromRow(row: {
  enabled: boolean;
  allowPublicLink: boolean;
  requirePassword: boolean;
  maxTtlDays: number | null;
  allowLiveHead: boolean;
  allowEmailAllowlist: boolean;
}): ClientSharePolicy {
  return {
    enabled: row.enabled,
    allowPublicLink: row.allowPublicLink,
    requirePassword: row.requirePassword,
    maxTtlDays: row.maxTtlDays,
    allowLiveHead: row.allowLiveHead,
    allowEmailAllowlist: row.allowEmailAllowlist,
  };
}

async function loadCompanyPolicy(companyId: string): Promise<ClientSharePolicy> {
  const db = getDb();
  const rows = await db
    .select()
    .from(companyClientSharePolicies)
    .where(eq(companyClientSharePolicies.companyId, companyId))
    .limit(1);
  const row = rows[0];
  return row ? policyFromRow(row) : { ...DEFAULT_CLIENT_SHARE_POLICY };
}

async function loadCollectionPolicyRow(
  platformProjectId: string
): Promise<ClientSharePolicy | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(collectionClientSharePolicies)
    .where(eq(collectionClientSharePolicies.platformProjectId, platformProjectId))
    .limit(1);
  const row = rows[0];
  return row ? policyFromRow(row) : null;
}

export async function getCompanyClientSharePolicy(
  companyId: string,
  actor: RequestUser
): Promise<{ ok: true; policy: ClientSharePolicy } | { ok: false; status: 403 | 404 }> {
  await ensureClientShareSchema();
  const company = await getCompanyById(companyId);
  if (!company) return { ok: false, status: 404 };
  // Admin company routes gate separately; here allow any authenticated caller that
  // reached this helper after admin check — still verify company exists.
  void actor;
  return { ok: true, policy: await loadCompanyPolicy(companyId) };
}

export async function patchCompanyClientSharePolicy(
  companyId: string,
  actor: RequestUser,
  patch: Partial<ClientSharePolicy>
): Promise<
  { ok: true; policy: ClientSharePolicy } | { ok: false; status: 403 | 404 | 400; error?: string }
> {
  await ensureClientShareSchema();
  const company = await getCompanyById(companyId);
  if (!company) return { ok: false, status: 404 };

  const current = await loadCompanyPolicy(companyId);
  const next: ClientSharePolicy = {
    ...current,
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
    .insert(companyClientSharePolicies)
    .values({
      companyId,
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
      target: companyClientSharePolicies.companyId,
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

export async function getClientSharePolicy(
  platformProjectId: string,
  actor: RequestUser
): Promise<{ ok: true; policy: ClientSharePolicy } | { ok: false; status: 403 | 404 }> {
  await ensureClientShareSchema();
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const canView = await userCanViewPlatformProject(actor.id, actor.role, platformProjectId);
  if (!canView) return { ok: false, status: 403 };

  const company = await loadCompanyPolicy(project.companyId);
  const collection = await loadCollectionPolicyRow(platformProjectId);
  return { ok: true, policy: mergeClientSharePolicy(company, collection) };
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

  const company = await loadCompanyPolicy(project.companyId);
  const stored = (await loadCollectionPolicyRow(platformProjectId)) ?? { ...company };
  const next: ClientSharePolicy = {
    ...stored,
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

  const loosen = collectionPolicyLoosensCompany(company, next);
  if (loosen) {
    return { ok: false, status: 400, error: loosen };
  }

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

  return { ok: true, policy: mergeClientSharePolicy(company, next) };
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
  void appendClientShareEvent({
    platformProjectId,
    shareId,
    eventType: 'client_share.revoked',
    actorUserId: actor.id,
    meta: { source: 'plexon_collection' },
  }).catch(() => undefined);
  return { ok: true };
}

export const CLIENT_SHARE_EVENT_TYPES = [
  'client_share.created',
  'client_share.revoked',
  'client_share.viewed',
  'client_share.unlock_failed',
] as const;

export type ClientShareEventType = (typeof CLIENT_SHARE_EVENT_TYPES)[number];

export type ClientShareEventInput = {
  platformProjectId: string;
  shareId: string;
  eventType: ClientShareEventType | string;
  actorUserId?: string | null;
  meta?: Record<string, unknown>;
  createdAt?: string | null;
  id?: string | null;
};

function isAllowedEventType(t: string): t is ClientShareEventType {
  return (CLIENT_SHARE_EVENT_TYPES as readonly string[]).includes(t);
}

/** Best-effort append; never throws to callers that void it. */
export async function appendClientShareEvent(
  input: ClientShareEventInput
): Promise<{ ok: true; id: string } | { ok: false; status: 400 | 403 | 404 }> {
  await ensureClientShareSchema();
  const platformProjectId = input.platformProjectId?.trim();
  const shareId = input.shareId?.trim();
  const eventType = input.eventType?.trim();
  if (!platformProjectId || !shareId || !eventType || !isAllowedEventType(eventType)) {
    return { ok: false, status: 400 };
  }
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };

  const id =
    typeof input.id === 'string' && input.id.trim()
      ? input.id.trim()
      : `cse_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
  const meta =
    input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta)
      ? sanitizeEventMeta(input.meta)
      : {};

  const db = getDb();
  await db
    .insert(creationClientShareEvents)
    .values({
      id,
      platformProjectId,
      shareId,
      eventType,
      actorUserId: input.actorUserId?.trim() || null,
      meta,
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
    })
    .onConflictDoNothing();
  return { ok: true, id };
}

function sanitizeEventMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase();
    if (key.includes('token') || key.includes('password') || key.includes('secret')) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      out[k] = v;
    } else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      out[k] = v.slice(0, 40);
    }
  }
  return out;
}

export const CLIENT_SHARE_AUDIT_EXPORT_MAX_ROWS = 10_000;
export const CLIENT_SHARE_AUDIT_EXPORT_MAX_DAYS = 90;

export async function exportClientShareEventsCsv(
  platformProjectId: string,
  actor: RequestUser
): Promise<{ ok: true; csv: string; filename: string } | { ok: false; status: 403 | 404 }> {
  await ensureClientShareSchema();
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404 };
  const canView = await userCanViewPlatformProject(actor.id, actor.role, platformProjectId);
  if (!canView) return { ok: false, status: 403 };

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - CLIENT_SHARE_AUDIT_EXPORT_MAX_DAYS);

  const db = getDb();
  const rows = await db
    .select()
    .from(creationClientShareEvents)
    .where(
      and(
        eq(creationClientShareEvents.platformProjectId, platformProjectId),
        gte(creationClientShareEvents.createdAt, since)
      )
    )
    .orderBy(desc(creationClientShareEvents.createdAt))
    .limit(CLIENT_SHARE_AUDIT_EXPORT_MAX_ROWS);

  const header = ['id', 'created_at', 'event_type', 'share_id', 'actor_user_id', 'meta_json'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.createdAt.toISOString()),
        csvEscape(r.eventType),
        csvEscape(r.shareId),
        csvEscape(r.actorUserId ?? ''),
        csvEscape(JSON.stringify(r.meta ?? {})),
      ].join(',')
    );
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    csv: `${lines.join('\n')}\n`,
    filename: `client-share-audit-${platformProjectId.slice(0, 8)}-${stamp}.csv`,
  };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
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
