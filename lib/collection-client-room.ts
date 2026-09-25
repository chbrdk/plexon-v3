/**
 * Collection ClientRoom (Enterprise E2).
 * Spec: specs/domain/suite-enterprise-program.md § E2
 */

import { createHash, randomBytes, randomUUID } from 'crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { isAdmin, type RequestUser } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  CLIENT_ROOM_SLOT_IDS,
  collectionClientRooms,
  type ClientRoomSlot,
  type ClientRoomSlotId,
  type ClientRoomSlots,
} from '@/lib/db/schema';
import { getPublicAppBaseUrl } from '@/lib/mail';
import { userCanManageCollectionLifecycle } from '@/lib/platform-project-access';
import { recordSuiteAuditEvent } from '@/lib/suite-audit';

export function hashClientRoomToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

export function generateClientRoomToken(): string {
  return `crm_${randomBytes(24).toString('base64url')}`;
}

export function isClientRoomSlotId(value: string): value is ClientRoomSlotId {
  return (CLIENT_ROOM_SLOT_IDS as readonly string[]).includes(value);
}

function publicRoomUrl(token: string): string {
  const base = getPublicAppBaseUrl();
  const path = `/share/room/${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}

export type ClientRoomPublic = {
  id: string;
  platformProjectId: string;
  revision: number;
  expiresAt: string | null;
  revokedAt: string | null;
  slots: ClientRoomSlots;
  hasPassword: boolean;
  createdAt: string;
};

function mapRoom(row: typeof collectionClientRooms.$inferSelect): ClientRoomPublic {
  return {
    id: row.id,
    platformProjectId: row.platformProjectId,
    revision: row.revision,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    slots: row.slots ?? {},
    hasPassword: Boolean(row.passwordHash),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getActiveClientRoom(
  platformProjectId: string
): Promise<ClientRoomPublic | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collectionClientRooms)
    .where(
      and(
        eq(collectionClientRooms.platformProjectId, platformProjectId.trim()),
        isNull(collectionClientRooms.revokedAt)
      )
    )
    .orderBy(desc(collectionClientRooms.createdAt))
    .limit(1);
  return row ? mapRoom(row) : null;
}

export async function createOrRotateClientRoom(input: {
  platformProjectId: string;
  actor: RequestUser;
  expiresInDays?: number | null;
}): Promise<
  | { ok: true; room: ClientRoomPublic; token: string; url: string }
  | { ok: false; status: 403 | 404 | 400; error: string }
> {
  const platformProjectId = input.platformProjectId.trim();
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return { ok: false, status: 404, error: 'Not found' };
  const allowed = await userCanManageCollectionLifecycle(input.actor, platformProjectId);
  if (!allowed) return { ok: false, status: 403, error: 'Forbidden' };

  const existing = await getActiveClientRoom(platformProjectId);
  const db = getDb();
  if (existing) {
    await db
      .update(collectionClientRooms)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(collectionClientRooms.id, existing.id));
    await recordSuiteAuditEvent({
      actorUserId: input.actor.id,
      platformProjectId,
      productId: 'plexon',
      action: 'revoked',
      subjectRef: existing.id,
    });
  }

  const token = generateClientRoomToken();
  const id = randomUUID();
  const expiresAt =
    typeof input.expiresInDays === 'number' && input.expiresInDays > 0
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  await db.insert(collectionClientRooms).values({
    id,
    platformProjectId,
    tokenHash: hashClientRoomToken(token),
    expiresAt,
    slots: existing?.slots ?? {},
    revision: (existing?.revision ?? 0) + 1,
    createdByUserId: input.actor.id,
  });

  await recordSuiteAuditEvent({
    actorUserId: input.actor.id,
    platformProjectId,
    productId: 'plexon',
    action: 'published',
    subjectRef: id,
  });

  const room = await getActiveClientRoom(platformProjectId);
  if (!room) return { ok: false, status: 400, error: 'create_failed' };
  return { ok: true, room, token, url: publicRoomUrl(token) };
}

export async function revokeClientRoom(input: {
  platformProjectId: string;
  actor: RequestUser;
}): Promise<{ ok: true } | { ok: false; status: 403 | 404 }> {
  const allowed = await userCanManageCollectionLifecycle(input.actor, input.platformProjectId);
  if (!allowed) return { ok: false, status: 403 };
  const room = await getActiveClientRoom(input.platformProjectId);
  if (!room) return { ok: false, status: 404 };
  const db = getDb();
  await db
    .update(collectionClientRooms)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(collectionClientRooms.id, room.id));
  await recordSuiteAuditEvent({
    actorUserId: input.actor.id,
    platformProjectId: input.platformProjectId,
    productId: 'plexon',
    action: 'revoked',
    subjectRef: room.id,
  });
  return { ok: true };
}

export async function setClientRoomSlot(input: {
  platformProjectId: string;
  actor: RequestUser;
  slotId: string;
  slot: Omit<ClientRoomSlot, 'approvedAt' | 'approvedByUserId'> | null;
  /**
   * Skip Collection-manage check. Use only after an access gate already ran:
   * service-secret + canView, or session freigabe (share/approve) that authorized the actor.
   */
  serviceTrusted?: boolean;
}): Promise<
  | { ok: true; room: ClientRoomPublic }
  | { ok: false; status: 400 | 403 | 404; error: string }
> {
  if (!isClientRoomSlotId(input.slotId)) {
    return { ok: false, status: 400, error: 'slot_invalid' };
  }
  const allowed =
    input.serviceTrusted === true ||
    isAdmin(input.actor) ||
    (await userCanManageCollectionLifecycle(input.actor, input.platformProjectId));
  if (!allowed) return { ok: false, status: 403, error: 'Forbidden' };

  const room = await getActiveClientRoom(input.platformProjectId);
  if (!room) return { ok: false, status: 404, error: 'room_missing' };

  const slots: ClientRoomSlots = { ...room.slots };
  if (input.slot == null) {
    delete slots[input.slotId];
  } else {
    if (!input.slot.subjectRef?.trim() || !input.slot.title?.trim()) {
      return { ok: false, status: 400, error: 'slot_incomplete' };
    }
    slots[input.slotId] = {
      productId: input.slot.productId.trim(),
      subjectRef: input.slot.subjectRef.trim(),
      title: input.slot.title.trim(),
      href: input.slot.href ?? null,
      approvedAt: new Date().toISOString(),
      approvedByUserId: input.actor.id,
    };
  }

  const db = getDb();
  await db
    .update(collectionClientRooms)
    .set({
      slots,
      revision: room.revision + 1,
      updatedAt: new Date(),
    })
    .where(eq(collectionClientRooms.id, room.id));

  await recordSuiteAuditEvent({
    actorUserId: input.actor.id,
    platformProjectId: input.platformProjectId,
    productId: input.slot?.productId ?? 'plexon',
    action: input.slot ? 'approved' : 'revoked',
    subjectRef: input.slot?.subjectRef ?? input.slotId,
  });

  const next = await getActiveClientRoom(input.platformProjectId);
  if (!next) return { ok: false, status: 404, error: 'room_missing' };
  return { ok: true, room: next };
}

export async function resolveClientRoomByToken(
  plainToken: string
): Promise<
  | { ok: true; room: ClientRoomPublic; projectName: string }
  | { ok: false; status: 404 | 410; error: string }
> {
  const token = plainToken.trim();
  if (!token) return { ok: false, status: 404, error: 'Not found' };
  const db = getDb();
  const [row] = await db
    .select()
    .from(collectionClientRooms)
    .where(eq(collectionClientRooms.tokenHash, hashClientRoomToken(token)))
    .limit(1);
  if (!row) return { ok: false, status: 404, error: 'Not found' };
  if (row.revokedAt) return { ok: false, status: 410, error: 'Revoked' };
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 410, error: 'Expired' };
  }
  const project = await getPlatformProjectById(row.platformProjectId);
  return {
    ok: true,
    room: mapRoom(row),
    projectName: project?.name ?? 'Collection',
  };
}
