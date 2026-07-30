/* ------------------------------------------------------------------ */
/*  PLEXON – GET /api/admin/usage/events (alle Nutzer, nur Admin)        */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-request-user';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseAdminUsageEventsParams } from '@/lib/admin-usage-events-params';
import { getDb } from '@/lib/db';
import { usageEvents, users } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', API_STATUS.UNAVAILABLE);

  const parsed = parseAdminUsageEventsParams(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return apiError(parsed.error, API_STATUS.BAD_REQUEST);
  }
  const { limit, offset, userId, service, eventType } = parsed.value;

  const conditions: SQL[] = [];
  if (userId) conditions.push(eq(usageEvents.userId, userId));
  if (service) conditions.push(eq(usageEvents.service, service));
  if (eventType) conditions.push(eq(usageEvents.eventType, eventType));

  const db = getDb();
  const base = db
    .select({
      id: usageEvents.id,
      userId: usageEvents.userId,
      userEmail: users.email,
      service: usageEvents.service,
      eventType: usageEvents.eventType,
      rawUnits: usageEvents.rawUnits,
      tokens: usageEvents.tokens,
      createdAt: usageEvents.createdAt,
    })
    .from(usageEvents)
    .leftJoin(users, eq(usageEvents.userId, users.id));

  const rows = await (conditions.length > 0 ? base.where(and(...conditions)) : base)
    .orderBy(desc(usageEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const events = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userEmail: r.userEmail ?? null,
    service: r.service,
    eventType: r.eventType,
    rawUnits: r.rawUnits ?? undefined,
    tokens: r.tokens,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ events });
}
