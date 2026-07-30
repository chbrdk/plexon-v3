import type { ConversationMessageWithMeta } from '@/lib/assistant/conversation-context';
import { resolveAssistantTargetUrl } from '@/lib/assistant/project-target-url';

export type ConversationUrlMessage = {
  role: string;
  content: string;
  metadata?: Record<string, unknown> | null;
};

export function toConversationHistory(
  messages: ConversationUrlMessage[]
): ConversationMessageWithMeta[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      metadata: m.metadata,
    }));
}

/** URL from the active chat (composer input + messages), project domain only as fallback. */
export function resolveConversationTargetUrl(options: {
  messages: ConversationUrlMessage[];
  draftPrompt?: string;
  projectDomain?: string | null;
  throughIndex?: number;
}): string | undefined {
  const slice =
    options.throughIndex === undefined
      ? options.messages
      : options.messages.slice(0, options.throughIndex + 1);

  return resolveAssistantTargetUrl({
    history: toConversationHistory(slice),
    prompt: options.draftPrompt ?? '',
    projectDomain: options.projectDomain,
  });
}
