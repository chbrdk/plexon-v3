import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getRequestUser } from '@/lib/auth-request-user'
import { isHelpEventType, recordHelpUsageEvent } from '@/lib/help/analytics'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  eventType: z.string().min(1),
  rawUnits: z.record(z.unknown()).optional(),
})

/**
 * POST /api/help/events — authenticated help analytics (tokens=0).
 * Spec: specs/domain/suite-help-docs.md Wave 3
 */
export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) {
    // Anonymous: accept but do not persist (no userId on usage_events).
    return NextResponse.json({ ok: true, persisted: false }, { status: 202 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!isHelpEventType(parsed.eventType)) {
    return NextResponse.json({ error: 'unknown_event' }, { status: 400 })
  }

  await recordHelpUsageEvent({
    userId: user.id,
    eventType: parsed.eventType,
    rawUnits: parsed.rawUnits,
  })

  return NextResponse.json({ ok: true, persisted: true })
}
