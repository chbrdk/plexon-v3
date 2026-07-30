export type AnthropicStreamContentItem = {
  type: string;
  text?: string;
  thinking?: string;
  signature?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
};

export type AnthropicStreamParseResult = {
  content: AnthropicStreamContentItem[];
  stop_reason: string;
};

export type AnthropicStreamCallbacks = {
  onTextDelta?: (delta: string) => void;
  onThinkingDelta?: (delta: string) => void;
};

type ActiveToolBlock = {
  id: string;
  name: string;
  inputJson: string;
};

type ActiveThinkingBlock = {
  thinking: string;
  signature: string;
};

function applyStreamPayload(
  payload: Record<string, unknown>,
  eventType: string,
  contentBlocks: AnthropicStreamContentItem[],
  activeText: Record<number, string>,
  activeTools: Record<number, ActiveToolBlock>,
  activeThinking: Record<number, ActiveThinkingBlock>,
  callbacks: AnthropicStreamCallbacks,
  setStopReason: (reason: string) => void
): void {
  const type = String(payload.type ?? eventType);

  if (type === 'content_block_start') {
    const index = typeof payload.index === 'number' ? payload.index : 0;
    const block = payload.content_block as Record<string, unknown> | undefined;
    if (block?.type === 'tool_use') {
      activeTools[index] = {
        id: String(block.id ?? ''),
        name: String(block.name ?? ''),
        inputJson: '',
      };
    } else if (block?.type === 'text') {
      activeText[index] = '';
    } else if (block?.type === 'thinking') {
      activeThinking[index] = { thinking: '', signature: '' };
    }
  }

  if (type === 'content_block_delta') {
    const index = typeof payload.index === 'number' ? payload.index : 0;
    const delta = payload.delta as Record<string, unknown> | undefined;
    if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
      activeText[index] = (activeText[index] ?? '') + delta.text;
      callbacks.onTextDelta?.(delta.text);
    }
    if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
      const thinking = activeThinking[index] ?? { thinking: '', signature: '' };
      thinking.thinking += delta.thinking;
      activeThinking[index] = thinking;
      callbacks.onThinkingDelta?.(delta.thinking);
    }
    if (delta?.type === 'signature_delta' && typeof delta.signature === 'string') {
      const thinking = activeThinking[index] ?? { thinking: '', signature: '' };
      thinking.signature += delta.signature;
      activeThinking[index] = thinking;
    }
    if (delta?.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
      const tool = activeTools[index];
      if (tool) tool.inputJson += delta.partial_json;
    }
  }

  if (type === 'content_block_stop') {
    const index = typeof payload.index === 'number' ? payload.index : 0;
    if (activeTools[index]) {
      const tool = activeTools[index];
      let input: Record<string, unknown> = {};
      if (tool.inputJson.trim()) {
        try {
          input = JSON.parse(tool.inputJson) as Record<string, unknown>;
        } catch {
          input = {};
        }
      }
      contentBlocks[index] = {
        type: 'tool_use',
        id: tool.id,
        name: tool.name,
        input,
      };
      delete activeTools[index];
    } else if (activeThinking[index]) {
      const thinking = activeThinking[index];
      contentBlocks[index] = {
        type: 'thinking',
        thinking: thinking.thinking,
        ...(thinking.signature ? { signature: thinking.signature } : {}),
      };
      delete activeThinking[index];
    } else if (activeText[index] !== undefined) {
      contentBlocks[index] = { type: 'text', text: activeText[index] };
      delete activeText[index];
    }
  }

  if (type === 'message_delta') {
    const delta = payload.delta as Record<string, unknown> | undefined;
    if (typeof delta?.stop_reason === 'string') {
      setStopReason(delta.stop_reason);
    }
  }

  if (type === 'error') {
    const err = payload.error as Record<string, unknown> | undefined;
    throw new Error(String(err?.message ?? JSON.stringify(payload.error ?? payload)));
  }
}

/**
 * Parse Anthropic Messages API SSE stream into final content blocks.
 */
export async function parseAnthropicMessageStream(
  body: ReadableStream<Uint8Array> | null,
  callbacks: AnthropicStreamCallbacks = {}
): Promise<AnthropicStreamParseResult> {
  if (!body) {
    throw new Error('Claude API stream empty body');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let stopReason = 'end_turn';

  const contentBlocks: AnthropicStreamContentItem[] = [];
  const activeText: Record<number, string> = {};
  const activeTools: Record<number, ActiveToolBlock> = {};
  const activeThinking: Record<number, ActiveThinkingBlock> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');

      let eventType = '';
      let dataLine = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventType = line.slice(6).trim();
        if (line.startsWith('data:')) dataLine += line.slice(5).trim();
      }
      if (!dataLine || dataLine === '[DONE]') continue;

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(dataLine) as Record<string, unknown>;
      } catch {
        continue;
      }

      applyStreamPayload(
        payload,
        eventType,
        contentBlocks,
        activeText,
        activeTools,
        activeThinking,
        callbacks,
        (reason) => {
          stopReason = reason;
        }
      );
    }
  }

  return { content: contentBlocks.filter(Boolean), stop_reason: stopReason };
}

/** Parse SSE blocks from a string (for unit tests). */
export function parseAnthropicSseBlocks(
  raw: string,
  callbacks: AnthropicStreamCallbacks = {}
): AnthropicStreamParseResult {
  let stopReason = 'end_turn';
  const contentBlocks: AnthropicStreamContentItem[] = [];
  const activeText: Record<number, string> = {};
  const activeTools: Record<number, ActiveToolBlock> = {};
  const activeThinking: Record<number, ActiveThinkingBlock> = {};

  for (const block of raw.split('\n\n')) {
    if (!block.trim()) continue;
    let dataLine = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('data:')) dataLine += line.slice(5).trim();
    }
    if (!dataLine) continue;
    const payload = JSON.parse(dataLine) as Record<string, unknown>;
    applyStreamPayload(
      payload,
      '',
      contentBlocks,
      activeText,
      activeTools,
      activeThinking,
      callbacks,
      (reason) => {
        stopReason = reason;
      }
    );
  }

  for (const [index, text] of Object.entries(activeText)) {
    contentBlocks[Number(index)] = { type: 'text', text };
  }
  for (const [index, thinking] of Object.entries(activeThinking)) {
    contentBlocks[Number(index)] = {
      type: 'thinking',
      thinking: thinking.thinking,
      ...(thinking.signature ? { signature: thinking.signature } : {}),
    };
  }

  return { content: contentBlocks.filter(Boolean), stop_reason: stopReason };
}
