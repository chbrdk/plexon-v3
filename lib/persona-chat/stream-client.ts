import type { ChatSendPayload, ChatStreamEvent } from '@audion-v3/contracts';
import { API_AUDION_CHAT_STREAM } from '@/lib/paths/audion-chat-api';

export type ChatStreamResult = {
  guestRemaining: number | null;
  guestSessionId: string | null;
};

export async function postPersonaChatStream(
  payload: ChatSendPayload,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<ChatStreamResult> {
  const response = await fetch(API_AUDION_CHAT_STREAM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
    signal,
  });

  const guestRemainingRaw = response.headers.get('X-Audion-Guest-Remaining');
  const guestRemaining =
    guestRemainingRaw != null && guestRemainingRaw !== ''
      ? Number.parseInt(guestRemainingRaw, 10)
      : null;
  const guestSessionId = response.headers.get('X-Plexon-Guest-Session')?.trim() || null;

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as {
      error?: string;
      code?: string;
      remaining?: number;
    } | null;
    onEvent({
      type: 'error',
      message: err?.error || `Stream failed (${response.status})`,
    });
    return {
      guestRemaining:
        typeof err?.remaining === 'number'
          ? err.remaining
          : Number.isFinite(guestRemaining)
            ? guestRemaining
            : null,
      guestSessionId,
    };
  }

  if (!response.body) {
    onEvent({ type: 'error', message: 'Empty stream body' });
    return { guestRemaining, guestSessionId };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as ChatStreamEvent);
      } catch {
        onEvent({ type: 'error', message: 'Malformed stream chunk' });
      }
    }
  }
  if (buffer.trim()) {
    try {
      onEvent(JSON.parse(buffer.trim()) as ChatStreamEvent);
    } catch {
      /* ignore trailing junk */
    }
  }

  return {
    guestRemaining: Number.isFinite(guestRemaining) ? guestRemaining : null,
    guestSessionId,
  };
}
