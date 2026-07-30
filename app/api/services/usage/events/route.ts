/* ------------------------------------------------------------------ */
/*  PLEXON – POST /api/services/usage/events (für CHECKION/AUDION)     */
/* ------------------------------------------------------------------ */
/* Services senden Usage-Events; werden in Tokens umgerechnet und      */
/* in usage_events + usage_aggregated gespeichert.                     */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { usageEvents, usageAggregated } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { tokensFromEvent, getCurrentPeriod } from '@/lib/usage-conversion';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { platformJson, readServiceSecret } from '@/lib/platform-contract';

function checkSecret(request: Request): boolean {
  const SERVICE_SECRET = process.env.PLEXON_SERVICE_SECRET ?? '';
  const secret = readServiceSecret(request);
  return Boolean(SERVICE_SECRET && secret === SERVICE_SECRET);
}

const eventBodySchema = z.object({
  user_id: z.string().min(1),
  service: z.enum(['checkion', 'audion', 'videon']),
  event_type: z.string().min(1),
  raw_units: z.record(z.unknown()).default({}),
  idempotency_key: z.string().optional(),
});

export async function POST(request: Request) {
  if (!checkSecret(request)) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  let body: z.infer<typeof eventBodySchema>;
  try {
    const raw = await request.json();
    body = eventBodySchema.parse(raw);
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.errors.map((x) => x.message).join('; ') : 'Invalid body';
    return apiError(msg, API_STATUS.BAD_REQUEST);
  }

  const tokens = tokensFromEvent(body.event_type, body.raw_units);
  const period = getCurrentPeriod();
  const db = getDb();

  const eventId = body.idempotency_key ?? randomUUID();

  try {
    const existingEvent = await db
      .select({ tokens: usageEvents.tokens })
      .from(usageEvents)
      .where(eq(usageEvents.id, eventId))
      .limit(1);
    if (existingEvent.length > 0) {
      return platformJson({ ok: true, tokens: existingEvent[0].tokens, period });
    }

    await db.insert(usageEvents).values({
      id: eventId,
      userId: body.user_id,
      service: body.service,
      eventType: body.event_type,
      rawUnits: body.raw_units,
      tokens,
    });

    const existing = await db
      .select()
      .from(usageAggregated)
      .where(
        and(
          eq(usageAggregated.userId, body.user_id),
          eq(usageAggregated.service, body.service),
          eq(usageAggregated.period, period)
        )
      )
      .limit(1);

    const now = new Date();
    if (existing.length > 0) {
      await db
        .update(usageAggregated)
        .set({
          tokensTotal: existing[0].tokensTotal + tokens,
          updatedAt: now,
        })
        .where(
          and(
            eq(usageAggregated.userId, body.user_id),
            eq(usageAggregated.service, body.service),
            eq(usageAggregated.period, period)
          )
        );
    } else {
      await db.insert(usageAggregated).values({
        userId: body.user_id,
        service: body.service,
        period,
        tokensTotal: tokens,
        updatedAt: now,
      });
    }
  } catch (e) {
    console.error('[PLEXON] usage/events insert failed:', e);
    return apiError('Failed to store usage event', API_STATUS.INTERNAL_ERROR);
  }

  return platformJson({ ok: true, tokens, period });
}
