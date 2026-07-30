import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import {
  extractPendingDomainFromHistory,
  type ConversationMessageWithMeta,
} from '@/lib/assistant/conversation-context';

import type { ConversationRecommendation } from '@/lib/assistant/insights/follow-up-suggestions';

/** Placeholder in static prompt templates when no project URL is known. */
export const ASSISTANT_PROMPT_URL_PLACEHOLDER = 'https://example.com';

export function normalizeAssistantTargetUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return ASSISTANT_PROMPT_URL_PLACEHOLDER;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/[.,;]+$/, '');
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function assistantTargetHost(url: string): string {
  return normalizeAssistantTargetUrl(url).replace(/^https?:\/\//i, '');
}

export function extractUrlFromUiLayout(uiLayout: unknown): string | undefined {
  if (!uiLayout || typeof uiLayout !== 'object') return undefined;
  const blocks = (uiLayout as UiLayout).blocks ?? [];
  for (const block of blocks) {
    const p = block.props;
    if (block.type === 'key_value_list') {
      const items = (p.items as Array<{ label: string; value: string | number }>) ?? [];
      for (const item of items) {
        if (/^url$|^domain$/i.test(item.label) && String(item.value).trim()) {
          return normalizeAssistantTargetUrl(String(item.value));
        }
      }
    }
    if (typeof p.url === 'string' && p.url.trim()) {
      return normalizeAssistantTargetUrl(p.url);
    }
  }
  return undefined;
}

export function extractUrlFromMessageMetadata(
  metadata?: Record<string, unknown> | null
): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const fromLayout = extractUrlFromUiLayout(metadata.uiLayout);
  if (fromLayout) return fromLayout;
  return undefined;
}

/** Best URL for recommendations / prompt chips: layout → conversation → project domain. */
export function resolveAssistantTargetUrl(options: {
  uiLayout?: unknown;
  history?: ConversationMessageWithMeta[];
  prompt?: string;
  projectDomain?: string | null;
}): string | undefined {
  const fromLayout = options.uiLayout ? extractUrlFromUiLayout(options.uiLayout) : undefined;
  if (fromLayout) return fromLayout;

  if (options.history) {
    const fromHistory = extractPendingDomainFromHistory(
      options.history,
      options.prompt ?? ''
    );
    if (fromHistory) return fromHistory;
  }

  if (options.projectDomain?.trim()) {
    return normalizeAssistantTargetUrl(options.projectDomain);
  }

  return undefined;
}

/** Re-apply the conversation URL to chips that still contain the placeholder domain. */
export function applyConversationTargetToRecommendations(
  prompts: ConversationRecommendation[],
  targetUrl?: string | null
): ConversationRecommendation[] {
  if (!targetUrl?.trim()) return prompts;
  const normalized = normalizeAssistantTargetUrl(targetUrl);
  if (normalized === ASSISTANT_PROMPT_URL_PLACEHOLDER) return prompts;

  return prompts.map((item) => {
    if (!item.prompt.includes('example.com') && !item.prompt.includes(ASSISTANT_PROMPT_URL_PLACEHOLDER)) {
      return item;
    }
    return {
      ...item,
      prompt: personalizeAssistantPrompt(item.prompt, { url: normalized }),
    };
  });
}

export function personalizeAssistantPrompt(
  template: string,
  options: { url?: string | null; projectName?: string | null }
): string {
  const url = options.url?.trim()
    ? normalizeAssistantTargetUrl(options.url)
    : ASSISTANT_PROMPT_URL_PLACEHOLDER;
  const host = assistantTargetHost(url);

  let out = template.replaceAll(ASSISTANT_PROMPT_URL_PLACEHOLDER, url);
  if (host !== 'example.com') {
    out = out.replaceAll('example.com', host);
  }

  const name = options.projectName?.trim();
  if (name) {
    out = out.replaceAll('"Acme"', `"${name}"`);
  }

  return out;
}
