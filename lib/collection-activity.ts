/**
 * Collection activity distillates (Enterprise E1).
 * Spec: suite-enterprise-program.md § E1
 */

import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { collectionActivityItems } from '@/lib/db/schema';

export type RecordCollectionActivityInput = {
  platformProjectId: string;
  productId: string;
  kind: string;
  status: string;
  subjectRef: string;
  title: string;
  href?: string | null;
  at?: string | null;
  actorUserId?: string | null;
};

export async function recordCollectionActivity(
  input: RecordCollectionActivityInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const platformProjectId = input.platformProjectId?.trim();
  const productId = input.productId?.trim();
  const kind = input.kind?.trim();
  const status = input.status?.trim();
  const subjectRef = input.subjectRef?.trim();
  const title = input.title?.trim();
  if (!platformProjectId) return { ok: false, error: 'project_required' };
  if (!productId) return { ok: false, error: 'product_required' };
  if (!kind) return { ok: false, error: 'kind_required' };
  if (!status) return { ok: false, error: 'status_required' };
  if (!subjectRef) return { ok: false, error: 'subject_required' };
  if (!title) return { ok: false, error: 'title_required' };

  const id = randomUUID();
  const at = input.at ? new Date(input.at) : new Date();
  if (Number.isNaN(at.getTime())) return { ok: false, error: 'at_invalid' };

  const db = getDb();
  await db.insert(collectionActivityItems).values({
    id,
    platformProjectId,
    productId,
    kind,
    status,
    subjectRef,
    title,
    href: input.href?.trim() || null,
    at,
    actorUserId: input.actorUserId?.trim() || null,
  });
  return { ok: true, id };
}

export async function listCollectionActivity(
  platformProjectId: string,
  opts?: { limit?: number }
): Promise<
  Array<{
    id: string;
    at: string;
    productId: string;
    kind: string;
    status: string;
    subjectRef: string;
    title: string;
    href: string | null;
    actorUserId: string | null;
  }>
> {
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 100);
  const db = getDb();
  const rows = await db
    .select()
    .from(collectionActivityItems)
    .where(eq(collectionActivityItems.platformProjectId, platformProjectId.trim()))
    .orderBy(desc(collectionActivityItems.at))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    productId: r.productId,
    kind: r.kind,
    status: r.status,
    subjectRef: r.subjectRef,
    title: r.title,
    href: r.href,
    actorUserId: r.actorUserId,
  }));
}
