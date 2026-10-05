/**
 * Client-side help analytics beacon.
 * Spec: specs/domain/suite-help-docs.md Wave 3
 */

import { API_HELP_EVENTS } from '@/lib/paths/help'
import type { HelpEventType } from '@/lib/help/analytics'

export function trackHelpEvent(
  eventType: HelpEventType,
  rawUnits?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify({ eventType, rawUnits: rawUnits ?? {} })
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      if (navigator.sendBeacon(API_HELP_EVENTS, blob)) return
    }
  } catch {
    /* fall through */
  }
  void fetch(API_HELP_EVENTS, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined)
}
