import { API_ASSISTANT_COMPLETE, API_ASSISTANT_COMPLETE_STREAM } from '@/lib/constants';
import type { AssistantStreamEvent } from '@/lib/assistant/assistant-sse';
import type { AssistantChatMessage } from '@/components/assistant/AssistantMessageList';

export type AssistantStreamDonePayload = {
  conversationId: string;
  workflowRunId?: string;
  text: string;
  metadata?: Record<string, unknown>;
  messageId: string;
};

export type AssistantStreamHandlers = {
  onPhase?: (phase: string, detail?: string) => void;
  onPlan?: (plan: Extract<AssistantStreamEvent, { type: 'plan' }>['plan']) => void;
  onRetrieval?: (data: Extract<AssistantStreamEvent, { type: 'retrieval' }>) => void;
  onToken?: (text: string) => void;
  onTokenReset?: () => void;
  onThinking?: (text: string) => void;
  onThinkingReset?: () => void;
  onToolCall?: (data: Extract<AssistantStreamEvent, { type: 'tool_call' }>) => void;
  onUiBlock?: (data: Extract<AssistantStreamEvent, { type: 'ui_block' }>) => void;
  onUiBlockUpdate?: (data: Extract<AssistantStreamEvent, { type: 'ui_block_update' }>) => void;
  onUiPanel?: (data: Extract<AssistantStreamEvent, { type: 'ui_panel' }>) => void;
  onUiReset?: () => void;
  onWorkflowRun?: (data: Extract<AssistantStreamEvent, { type: 'workflow_run' }>) => void;
  onDone?: (payload: AssistantStreamDonePayload) => void;
  onError?: (message: string, details?: string) => void;
};

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split('\n');
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

export async function postAssistantCompleteStream(
  body: Record<string, unknown>,
  handlers: AssistantStreamHandlers
): Promise<AssistantStreamDonePayload | null> {
  const res = await fetch(API_ASSISTANT_COMPLETE_STREAM, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = errText || res.statusText;
    try {
      const parsed = JSON.parse(errText) as { error?: string; details?: string };
      message = [parsed.error, parsed.details].filter(Boolean).join(': ') || message;
    } catch {
      /* raw */
    }
    handlers.onError?.(message);
    throw new Error(message);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Stream not supported');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let donePayload: AssistantStreamDonePayload | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const parsed = parseSseBlock(part.trim());
      if (!parsed) continue;
      let event: AssistantStreamEvent;
      try {
        event = JSON.parse(parsed.data) as AssistantStreamEvent;
      } catch {
        continue;
      }

      if (event.type === 'phase') handlers.onPhase?.(event.phase, event.detail);
      if (event.type === 'plan') handlers.onPlan?.(event.plan);
      if (event.type === 'retrieval') handlers.onRetrieval?.(event);
      if (event.type === 'token') handlers.onToken?.(event.text);
      if (event.type === 'token_reset') handlers.onTokenReset?.();
      if (event.type === 'thinking') handlers.onThinking?.(event.text);
      if (event.type === 'thinking_reset') handlers.onThinkingReset?.();
      if (event.type === 'tool_call') handlers.onToolCall?.(event);
      if (event.type === 'ui_block') handlers.onUiBlock?.(event);
      if (event.type === 'ui_block_update') handlers.onUiBlockUpdate?.(event);
      if (event.type === 'ui_panel') handlers.onUiPanel?.(event);
      if (event.type === 'ui_reset') handlers.onUiReset?.();
      if (event.type === 'workflow_run') handlers.onWorkflowRun?.(event);
      if (event.type === 'done') {
        donePayload = event.payload;
        handlers.onDone?.(event.payload);
      }
      if (event.type === 'error') {
        handlers.onError?.(event.message, event.details);
        throw new Error(event.details ?? event.message);
      }
    }
  }

  return donePayload;
}

/** Fallback when streaming is unavailable. */
export async function postAssistantComplete(
  body: Record<string, unknown>
): Promise<{
  conversationId: string;
  workflowRunId?: string;
  message: AssistantChatMessage;
}> {
  const res = await fetch(API_ASSISTANT_COMPLETE, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || res.statusText);
  }
  return res.json() as Promise<{
    conversationId: string;
    workflowRunId?: string;
    message: AssistantChatMessage;
  }>;
}
