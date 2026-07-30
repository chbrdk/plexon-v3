import type { AssistantPlan } from '@/lib/assistant/assistant-planner';

export type AssistantStreamPhase =
  | 'planning'
  | 'retrieval'
  | 'executing'
  | 'tools'
  | 'workflow'
  | 'done';

export type AssistantStreamEvent =
  | { type: 'phase'; phase: AssistantStreamPhase; detail?: string }
  | {
      type: 'plan';
      plan: {
        intent: AssistantPlan['intent'];
        mode: AssistantPlan['mode'];
        toolFamilies: AssistantPlan['toolFamilies'];
        maxToolRounds: number;
        skipTools: boolean;
        source: AssistantPlan['plannerSource'];
        reasoning: string;
      };
    }
  | { type: 'retrieval'; hits: number; terms: string[]; vectorHits?: number }
  | { type: 'token'; text: string }
  | { type: 'token_reset' }
  | { type: 'thinking'; text: string }
  | { type: 'thinking_reset' }
  | { type: 'tool_call'; status: 'start' | 'done'; name: string; preview?: string }
  | { type: 'ui_block'; block: { id: string; type: string; props: Record<string, unknown> }; index: number }
  | { type: 'ui_block_update'; block: { id: string; type: string; props: Record<string, unknown> }; index: number }
  | { type: 'ui_panel'; panel: { open: boolean; title?: string; blocks: Array<{ id: string; type: string; props: Record<string, unknown> }> } }
  | { type: 'ui_reset' }
  | { type: 'workflow_run'; workflowRunId: string; workflowType: string }
  | {
      type: 'done';
      payload: {
        conversationId: string;
        workflowRunId?: string;
        text: string;
        metadata?: Record<string, unknown>;
        messageId: string;
      };
    }
  | { type: 'error'; message: string; details?: string };

export function encodeAssistantSseEvent(event: AssistantStreamEvent): string {
  const name =
    event.type === 'phase'
      ? 'phase'
      : event.type === 'plan'
        ? 'plan'
        : event.type === 'retrieval'
          ? 'retrieval'
          : event.type === 'token'
            ? 'token'
            : event.type === 'token_reset'
              ? 'token_reset'
              : event.type === 'thinking'
                ? 'thinking'
                : event.type === 'thinking_reset'
                  ? 'thinking_reset'
                  : event.type === 'tool_call'
                    ? 'tool_call'
                    : event.type === 'ui_block'
                      ? 'ui_block'
                      : event.type === 'ui_block_update'
                        ? 'ui_block_update'
                        : event.type === 'ui_panel'
                          ? 'ui_panel'
                          : event.type === 'ui_reset'
                        ? 'ui_reset'
                        : event.type === 'workflow_run'
                          ? 'workflow_run'
                          : event.type === 'done'
              ? 'done'
              : 'error';
  return `event: ${name}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function createAssistantSseStream(
  run: (emit: (event: AssistantStreamEvent) => void) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const emit = (event: AssistantStreamEvent) => {
        controller.enqueue(encoder.encode(encodeAssistantSseEvent(event)));
      };
      try {
        await run(emit);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        emit({ type: 'error', message, details: message });
      } finally {
        controller.close();
      }
    },
  });
}

export function assistantSseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
