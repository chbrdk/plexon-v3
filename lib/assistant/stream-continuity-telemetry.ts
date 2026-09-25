/**
 * Staging-facing continuity signals for remount / empty-done.
 * Spec: specs/domain/central-assistant-flyout.md § Continuity observability
 */

import { API_ASSISTANT_CONTINUITY } from '@/lib/constants';

export const ASSISTANT_CONTINUITY_EVENT_TYPES = [
  'assistant_remount_while_streaming',
  'assistant_empty_done',
] as const;

export type AssistantContinuityEventType =
  (typeof ASSISTANT_CONTINUITY_EVENT_TYPES)[number];

export type AssistantContinuityEvent = {
  type: AssistantContinuityEventType;
  conversationId?: string | null;
  presentation?: 'overlay' | 'expand' | string | null;
  hasUiLayout?: boolean;
  streamId?: string | null;
};

const LOG_PREFIX = '[assistant/continuity]';

/** True when a done payload has neither text nor UI layout blocks. */
export function isEmptyAssistantDone(input: {
  text?: string | null;
  metadata?: Record<string, unknown> | null;
}): boolean {
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (text) return false;
  const ui = input.metadata?.uiLayout as
    | { blocks?: unknown[]; panel?: { blocks?: unknown[]; open?: boolean } }
    | undefined;
  if (!ui || typeof ui !== 'object') return true;
  const blocks = Array.isArray(ui.blocks) ? ui.blocks.length : 0;
  const panelBlocks = Array.isArray(ui.panel?.blocks) ? ui.panel!.blocks!.length : 0;
  const panelOpen = Boolean(ui.panel?.open);
  return blocks === 0 && panelBlocks === 0 && !panelOpen;
}

function buildBeaconPayload(event: AssistantContinuityEvent): string {
  return JSON.stringify({
    type: event.type,
    conversationId: event.conversationId ?? null,
    presentation: event.presentation ?? null,
    hasUiLayout: event.hasUiLayout ?? null,
    streamId: event.streamId ?? null,
  });
}

/**
 * Best-effort POST to `/api/assistant/continuity` (sendBeacon or keepalive fetch).
 * Fail-closed: never throws; no message content / no PII beyond conversation id.
 */
export function beaconAssistantContinuityEvent(event: AssistantContinuityEvent): void {
  try {
    const body = buildBeaconPayload(event);
    const url = API_ASSISTANT_CONTINUITY;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      if (ok) return;
    }
    if (typeof fetch === 'function') {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include',
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // ignore
  }
}

/**
 * Emit a structured continuity event for staging log greps + durable beacon.
 */
export function reportAssistantContinuityEvent(event: AssistantContinuityEvent): void {
  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    try {
      console.info(LOG_PREFIX, event.type, {
        conversationId: event.conversationId ?? null,
        presentation: event.presentation ?? null,
        hasUiLayout: event.hasUiLayout ?? null,
        streamId: event.streamId ?? null,
      });
    } catch {
      // ignore
    }
  }
  beaconAssistantContinuityEvent(event);
}

export { LOG_PREFIX as ASSISTANT_CONTINUITY_LOG_PREFIX };
