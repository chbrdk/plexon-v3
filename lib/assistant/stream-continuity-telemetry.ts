/**
 * Staging-facing continuity signals for remount / empty-done.
 * Spec: specs/domain/central-assistant-flyout.md § Continuity observability
 */

export type AssistantContinuityEventType =
  | 'assistant_remount_while_streaming'
  | 'assistant_empty_done';

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

/**
 * Emit a structured continuity event for staging log greps.
 * No network call — keep fail-closed and free of PII beyond conversation id.
 */
export function reportAssistantContinuityEvent(event: AssistantContinuityEvent): void {
  if (typeof console === 'undefined' || typeof console.info !== 'function') return;
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

export { LOG_PREFIX as ASSISTANT_CONTINUITY_LOG_PREFIX };
