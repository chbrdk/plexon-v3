/* ------------------------------------------------------------------ */
/*  PLEXON – GET /api/admin/usage (Nutzung aller User, nur Admin)       */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { usageAggregated } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const db = getDb();
  const rows = await db
    .select()
    .from(usageAggregated)
    .orderBy(desc(usageAggregated.period), desc(usageAggregated.tokensTotal));

  const byUser: Record<
    string,
    { period: string; service: string; tokensTotal: number; updatedAt: string }[]
  > = {};
  for (const r of rows) {
    if (!byUser[r.userId]) byUser[r.userId] = [];
    byUser[r.userId].push({
      period: r.period,
      service: r.service,
      tokensTotal: r.tokensTotal,
      updatedAt: r.updatedAt.toISOString(),
    });
  }

  return NextResponse.json({
    summary: rows.map((r) => ({
      userId: r.userId,
      service: r.service,
      period: r.period,
      tokensTotal: r.tokensTotal,
      updatedAt: r.updatedAt.toISOString(),
    })),
    byUser,
  });
}
