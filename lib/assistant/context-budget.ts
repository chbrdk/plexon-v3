type HistoryMessage = { role: 'user' | 'assistant'; content: string };

/** ~12k tokens per MCP tool result. */
export const ASSISTANT_MAX_TOOL_RESULT_CHARS = 48_000;

/** Per chat history message. */
export const ASSISTANT_MAX_HISTORY_MESSAGE_CHARS = 8_000;

/** Recent turns kept for the LLM. */
export const ASSISTANT_MAX_HISTORY_MESSAGES = 20;

/** Injected project context block in system prompt. */
export const ASSISTANT_MAX_PROJECT_CONTEXT_CHARS = 24_000;

/** Compact platform navigation map in system prompt. */
export const ASSISTANT_MAX_PLATFORM_NAV_CHARS = 2_000;

/** Rough chars budget before we trim older tool rounds (safety net). */
export const ASSISTANT_MAX_PROMPT_CHARS = 2_000_000;

export function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateAssistantText(
  text: string,
  maxChars: number,
  label = 'Inhalt'
): string {
  if (!text || text.length <= maxChars) return text;
  const kept = text.slice(0, maxChars);
  return `${kept}\n\n… [${label} gekürzt: ${text.length.toLocaleString('de-DE')} → ${maxChars.toLocaleString('de-DE')} Zeichen]`;
}

export function trimMessageHistory(
  messages: HistoryMessage[],
  options: {
    maxMessages?: number;
    maxMessageChars?: number;
  } = {}
): HistoryMessage[] {
  const maxMessages = options.maxMessages ?? ASSISTANT_MAX_HISTORY_MESSAGES;
  const maxMessageChars = options.maxMessageChars ?? ASSISTANT_MAX_HISTORY_MESSAGE_CHARS;
  const slice = messages.slice(-maxMessages);
  return slice.map((m) => ({
    role: m.role,
    content: truncateAssistantText(m.content, maxMessageChars, 'Chat-Verlauf'),
  }));
}

export function estimatePromptChars(parts: {
  systemPrompt?: string;
  messagesJson: string;
  toolsJson?: string;
}): number {
  return (
    (parts.systemPrompt?.length ?? 0) +
    parts.messagesJson.length +
    (parts.toolsJson?.length ?? 0)
  );
}
