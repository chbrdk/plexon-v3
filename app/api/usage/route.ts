/* ------------------------------------------------------------------ */
/*  PLEXON – GET /api/usage (Nutzung des eingeloggten Users)           */
/*  Inkl. History (recentEvents) und Chart-Daten (byDay, byMonth).    */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-request-user';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDb } from '@/lib/db';
import { usageAggregated, usageEvents } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const RECENT_EVENTS_LIMIT = 100;
const CHART_DAYS = 30;

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user?.id) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const db = getDb();

  const [rows, recentRows, byDayResult] = await Promise.all([
    db
      .select()
      .from(usageAggregated)
      .where(eq(usageAggregated.userId, user.id))
      .orderBy(desc(usageAggregated.period)),
    db
      .select({
        id: usageEvents.id,
        service: usageEvents.service,
        eventType: usageEvents.eventType,
        rawUnits: usageEvents.rawUnits,
        tokens: usageEvents.tokens,
        createdAt: usageEvents.createdAt,
      })
      .from(usageEvents)
      .where(eq(usageEvents.userId, user.id))
      .orderBy(desc(usageEvents.createdAt))
      .limit(RECENT_EVENTS_LIMIT),
    db.execute<{ day: string; tokens: number }>(sql`
      SELECT (created_at AT TIME ZONE 'UTC')::date::text as day, sum(tokens)::int as tokens
      FROM usage_events
      WHERE user_id = ${user.id} AND created_at >= now() - interval '${sql.raw(String(CHART_DAYS))} days'
      GROUP BY (created_at AT TIME ZONE 'UTC')::date
      ORDER BY day
    `),
  ]);

  const byPeriod: Record<string, { service: string; period: string; tokensTotal: number }[]> = {};
  for (const r of rows) {
    if (!byPeriod[r.period]) byPeriod[r.period] = [];
    byPeriod[r.period].push({
      service: r.service,
      period: r.period,
      tokensTotal: r.tokensTotal,
    });
  }

  const summary = rows.map((r) => ({
    service: r.service,
    period: r.period,
    tokensTotal: r.tokensTotal,
    updatedAt: r.updatedAt.toISOString(),
  }));

  const recentEvents = recentRows.map((r) => ({
    id: r.id,
    service: r.service,
    eventType: r.eventType,
    rawUnits: r.rawUnits ?? undefined,
    tokens: r.tokens,
    createdAt: r.createdAt.toISOString(),
  }));

  const byDayRows = Array.isArray(byDayResult)
    ? byDayResult
    : Array.isArray((byDayResult as { rows?: unknown[] }).rows)
      ? (byDayResult as { rows: { day?: string; tokens?: number }[] }).rows
      : [];
  const byDay = byDayRows.map((r: { day?: string; tokens?: number }) => ({
    date: r.day ?? '',
    tokens: Number(r.tokens ?? 0),
  }));

  return NextResponse.json({
    userId: user.id,
    summary,
    byPeriod,
    recentEvents,
    byDay,
  });
}
