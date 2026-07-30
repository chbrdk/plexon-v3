import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { usageAggregated, usageEvents } from '@/lib/db/schema';
import { getCurrentPeriod, tokensFromEvent } from '@/lib/usage-conversion';

export async function recordAssistantUsageEvent(input: {
  userId: string;
  eventType: 'chat' | 'llm_request' | 'workflow_run';
  rawUnits?: Record<string, unknown>;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const db = getDb();
    const tokens = Math.max(0, Math.round(tokensFromEvent(input.eventType, input.rawUnits ?? {})));
    const eventId = randomUUID();
    const period = getCurrentPeriod();

    await db.insert(usageEvents).values({
      id: eventId,
      userId: input.userId,
      service: 'plexon',
      eventType: input.eventType,
      rawUnits: input.rawUnits ?? null,
      tokens,
    });

    const existing = await db
      .select()
      .from(usageAggregated)
      .where(
        and(
          eq(usageAggregated.userId, input.userId),
          eq(usageAggregated.service, 'plexon'),
          eq(usageAggregated.period, period)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(usageAggregated)
        .set({
          tokensTotal: existing[0].tokensTotal + tokens,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(usageAggregated.userId, input.userId),
            eq(usageAggregated.service, 'plexon'),
            eq(usageAggregated.period, period)
          )
        );
    } else {
      await db.insert(usageAggregated).values({
        userId: input.userId,
        service: 'plexon',
        period,
        tokensTotal: tokens,
        updatedAt: new Date(),
      });
    }
  } catch (e) {
    console.warn('[assistant/usage] failed to record usage event', e);
  }
}
