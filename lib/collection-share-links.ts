/**
 * Collection Share Links registry (cross-product).
 * Spec: specs/domain/collection-share-links.md
 */

import { and, desc, eq, isNull } from 'drizzle-orm';
import type { RequestUser } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  COLLECTION_SHARE_LINK_KINDS,
  COLLECTION_SHARE_LINK_PRODUCT_IDS,
  collectionShareLinks,
  type CollectionShareLinkKind,
  type CollectionShareLinkProductId,
} from '@/lib/db/schema';
import {
  userCanManageCollectionLifecycle,
  userCanViewPlatformProject,
} from '@/lib/platform-project-access';

export type CollectionShareLinkPublic = {
  productId: string;
  shareId: string;
  platformProjectId: string;
  kind: string;
  title: string;
  href: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type UpsertCollectionShareLinkInput = {
  platformProjectId: string;
  productId: string;
  shareId: string;
  kind: string;
  title: string;
  href?: string | null;
  expiresAt?: string | null;
  revoked?: boolean;
  meta?: Record<string, unknown>;
  /** Service path already validated canView. */
  serviceTrusted?: boolean;
  actor: RequestUser;
};

function isProductId(value: string): value is CollectionShareLinkProductId {
  return (COLLECTION_SHARE_LINK_PRODUCT_IDS as readonly string[]).includes(value);
}

function isKind(value: string): value is CollectionShareLinkKind {
  return (COLLECTION_SHARE_LINK_KINDS as readonly string[]).includes(value);
}

function sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
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

function mapRow(row: typeof collectionShareLinks.$inferSelect): CollectionShareLinkPublic {
  return {
    productId: row.productId,
    shareId: row.shareId,
    platformProjectId: row.platformProjectId,
    kind: row.kind,
    title: row.title,
    href: row.href ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    meta: (row.meta ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCollectionShareLinks(
  platformProjectId: string,
  actor: RequestUser,
  opts?: { includeRevoked?: boolean }
): Promise<
  | { ok: true; items: CollectionShareLinkPublic[] }
  | { ok: false; status: 403 | 404 }
> {
  const id = platformProjectId.trim();
  const project = await getPlatformProjectById(id);
  if (!project) return { ok: false, status: 404 };
  const canView = await userCanViewPlatformProject(actor.id, actor.role, id);
  if (!canView) return { ok: false, status: 403 };

  const db = getDb();
  const rows = await db
    .select()
    .from(collectionShareLinks)
    .where(
      opts?.includeRevoked
        ? eq(collectionShareLinks.platformProjectId, id)
        : and(
            eq(collectionShareLinks.platformProjectId, id),
            isNull(collectionShareLinks.revokedAt)
          )
    )
    .orderBy(desc(collectionShareLinks.createdAt));

  return { ok: true, items: rows.map(mapRow) };
}

export async function upsertCollectionShareLink(
  input: UpsertCollectionShareLinkInput
): Promise<
  | { ok: true; item: CollectionShareLinkPublic }
  | { ok: false; status: 400 | 403 | 404; error: string }
> {
  const platformProjectId = input.platformProjectId.trim();
  const productId = input.productId.trim();
  const shareId = input.shareId.trim();
  const kind = input.kind.trim();
  const title = input.title.trim();

  if (!platformProjectId || !productId || !shareId || !kind || !title) {
    return { ok: false, status: 400, error: 'incomplete' };
  }
  if (!isProductId(productId)) return { ok: false, status: 400, error: 'product_invalid' };
  if (!isKind(kind)) return { ok: false, status: 400, error: 'kind_invalid' };

  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404, error: 'Not found' };

  if (input.serviceTrusted === true) {
    const canView = await userCanViewPlatformProject(
      input.actor.id,
      input.actor.role,
      platformProjectId
    );
    if (!canView) return { ok: false, status: 403, error: 'Forbidden' };
  } else {
    const allowed = await userCanManageCollectionLifecycle(input.actor, platformProjectId);
    if (!allowed) return { ok: false, status: 403, error: 'Forbidden' };
  }

  const now = new Date();
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const revokedAt = input.revoked ? now : null;
  const href = input.href?.trim() || null;
  const meta = sanitizeMeta(input.meta);

  const db = getDb();
  await db
    .insert(collectionShareLinks)
    .values({
      productId,
      shareId,
      platformProjectId,
      kind,
      title,
      href,
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      revokedAt,
      meta,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [collectionShareLinks.productId, collectionShareLinks.shareId],
      set: {
        platformProjectId,
        kind,
        title,
        href,
        expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
        revokedAt,
        meta,
        updatedAt: now,
      },
    });

  const [row] = await db
    .select()
    .from(collectionShareLinks)
    .where(
      and(
        eq(collectionShareLinks.productId, productId),
        eq(collectionShareLinks.shareId, shareId)
      )
    )
    .limit(1);

  if (!row) return { ok: false, status: 400, error: 'upsert_failed' };
  return { ok: true, item: mapRow(row) };
}

/**
 * Internal dual-write helper — caller already authorized the Creation projection write.
 * Never throws.
 */
export async function dualWriteCreationShareLink(input: {
  platformProjectId: string;
  shareId: string;
  title: string;
  expiresAt?: string | null;
  revoked?: boolean;
  meta?: Record<string, unknown>;
  actor: RequestUser;
}): Promise<void> {
  try {
    await upsertCollectionShareLink({
      platformProjectId: input.platformProjectId,
      productId: 'creation',
      shareId: input.shareId,
      kind: 'client_page',
      title: input.title,
      href: null,
      expiresAt: input.expiresAt,
      revoked: input.revoked,
      meta: input.meta,
      serviceTrusted: true,
      actor: input.actor,
    });
  } catch {
    // best-effort
  }
}

export async function revokeCollectionShareLink(input: {
  platformProjectId: string;
  productId: string;
  shareId: string;
  actor: RequestUser;
}): Promise<{ ok: true } | { ok: false; status: 400 | 403 | 404; error: string }> {
  const platformProjectId = input.platformProjectId.trim();
  const productId = input.productId.trim();
  const shareId = input.shareId.trim();
  if (!platformProjectId || !productId || !shareId) {
    return { ok: false, status: 400, error: 'incomplete' };
  }
  if (!isProductId(productId)) return { ok: false, status: 400, error: 'product_invalid' };

  const allowed = await userCanManageCollectionLifecycle(input.actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403, error: 'Forbidden' };

  if (productId === 'creation') {
    const { revokeClientShareProjection } = await import('@/lib/creation-client-share');
    const fanout = await revokeClientShareProjection(platformProjectId, shareId, input.actor);
    if (!fanout.ok) {
      const status =
        fanout.status === 404 ? 404 : fanout.status === 403 ? 403 : 400;
      return { ok: false, status, error: fanout.error || 'creation_revoke_failed' };
    }
    // revokeClientShareProjection dual-writes revoked into collection_share_links
    return { ok: true };
  }

  const db = getDb();
  const now = new Date();
  const updated = await db
    .update(collectionShareLinks)
    .set({ revokedAt: now, updatedAt: now })
    .where(
      and(
        eq(collectionShareLinks.productId, productId),
        eq(collectionShareLinks.shareId, shareId),
        eq(collectionShareLinks.platformProjectId, platformProjectId),
        isNull(collectionShareLinks.revokedAt)
      )
    )
    .returning({ shareId: collectionShareLinks.shareId });

  if (updated.length === 0) {
    return { ok: false, status: 404, error: 'Not found' };
  }

  return { ok: true };
}
