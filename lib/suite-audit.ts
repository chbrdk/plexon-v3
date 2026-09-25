/**
 * Suite audit append (Enterprise E4).
 * Spec: specs/domain/suite-enterprise-program.md § E4
 */

import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  SUITE_AUDIT_ACTIONS,
  suiteAuditEvents,
  type SuiteAuditAction,
} from '@/lib/db/schema';

export type RecordSuiteAuditInput = {
  actorUserId: string;
  platformProjectId: string;
  productId: string;
  action: SuiteAuditAction | string;
  subjectRef?: string | null;
  modelRef?: string | null;
  meta?: Record<string, unknown>;
};

export function isSuiteAuditAction(value: string): value is SuiteAuditAction {
  return (SUITE_AUDIT_ACTIONS as readonly string[]).includes(value);
}

export async function recordSuiteAuditEvent(
  input: RecordSuiteAuditInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const actorUserId = input.actorUserId?.trim();
  if (!actorUserId) return { ok: false, error: 'actor_required' };
  const platformProjectId = input.platformProjectId?.trim();
  if (!platformProjectId) return { ok: false, error: 'project_required' };
  const productId = input.productId?.trim();
  if (!productId) return { ok: false, error: 'product_required' };
  const action = input.action?.trim();
  if (!action || !isSuiteAuditAction(action)) return { ok: false, error: 'action_invalid' };

  const id = randomUUID();
  const db = getDb();
  await db.insert(suiteAuditEvents).values({
    id,
    actorUserId,
    platformProjectId,
    productId,
    action,
    subjectRef: input.subjectRef?.trim() || null,
    modelRef: input.modelRef?.trim() || null,
    meta: input.meta ?? {},
  });
  return { ok: true, id };
}

export async function listSuiteAuditEvents(
  platformProjectId: string,
  opts?: { limit?: number }
): Promise<
  Array<{
    id: string;
    at: string;
    actorUserId: string;
    productId: string;
    action: string;
    subjectRef: string | null;
    modelRef: string | null;
  }>
> {
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
  const db = getDb();
  const rows = await db
    .select()
    .from(suiteAuditEvents)
    .where(eq(suiteAuditEvents.platformProjectId, platformProjectId.trim()))
    .orderBy(desc(suiteAuditEvents.at))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    actorUserId: r.actorUserId,
    productId: r.productId,
    action: r.action,
    subjectRef: r.subjectRef,
    modelRef: r.modelRef,
  }));
}
