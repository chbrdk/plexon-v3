/**
 * Suite Docs & Help analytics (Wave 3).
 * Spec: specs/domain/suite-help-docs.md
 * Events land in usage_events (tokens=0) for authenticated users.
 */

import { randomUUID } from 'crypto'
import { getDb } from '@/lib/db'
import { usageEvents } from '@/lib/db/schema'

export const HELP_EVENT_TYPES = [
  'help_open',
  'help_search_zero',
  'help_article_open',
  'help_ask_assistant',
  'help_walkthrough_started',
  'help_walkthrough_step',
  'help_walkthrough_completed',
  'help_walkthrough_skipped',
] as const

export type HelpEventType = (typeof HELP_EVENT_TYPES)[number]

export function isHelpEventType(value: string): value is HelpEventType {
  return (HELP_EVENT_TYPES as readonly string[]).includes(value)
}

/** Best-effort; never throws to callers. Skips when DB/user missing. */
export async function recordHelpUsageEvent(input: {
  userId: string
  eventType: HelpEventType
  rawUnits?: Record<string, unknown>
}): Promise<void> {
  if (!process.env.DATABASE_URL) return
  try {
    const db = getDb()
    await db.insert(usageEvents).values({
      id: randomUUID(),
      userId: input.userId,
      service: 'plexon',
      eventType: input.eventType,
      rawUnits: input.rawUnits ?? null,
      tokens: 0,
    })
  } catch {
    /* ignore analytics failures */
  }
}
