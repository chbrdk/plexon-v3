import { extractScopedProjectName } from '@/lib/assistant/create-project-scope';

export type ConversationMessage = { role: 'user' | 'assistant'; content: string };
export type ConversationMessageWithMeta = ConversationMessage & {
  metadata?: Record<string, unknown> | null;
};

const URL_PATTERN = /https?:\/\/[^\s]+/i;
const DOMAIN_PATTERN = /\b([a-z0-9][-a-z0-9]*\.[a-z]{2,}(?:\.[a-z]{2,})?)\b/i;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

export function extractUrlFromText(text: string): string | undefined {
  const urlMatch = text.match(URL_PATTERN);
  if (urlMatch) return urlMatch[0].replace(/[.,;*`]+$/g, '');
  const domainMatch = text.match(DOMAIN_PATTERN);
  if (domainMatch) return `https://${domainMatch[1]}`;
  return undefined;
}

export function extractPendingProjectNameFromHistory(
  history: ConversationMessage[],
  currentPrompt: string
): string | undefined {
  const fromCurrent = extractScopedProjectName(currentPrompt);
  if (fromCurrent) return fromCurrent;

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role !== 'user') continue;
    const name = extractScopedProjectName(msg.content);
    if (name) return name;
    const quoted = msg.content.match(/['"„]([^'"”]+)['"”]/);
    if (quoted?.[1]?.trim()) return quoted[1].trim();
  }
  return undefined;
}

export function extractPendingDomainFromHistory(
  history: ConversationMessage[],
  currentPrompt: string
): string | undefined {
  const fromCurrent = extractUrlFromText(currentPrompt);
  if (fromCurrent) return fromCurrent;
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === 'user') {
      const url = extractUrlFromText(msg.content);
      if (url) return url;
      continue;
    }
    if (msg.role === 'assistant') {
      const withMeta = msg as ConversationMessageWithMeta;
      const fromMeta = extractUrlFromAssistantMetadata(withMeta.metadata);
      if (fromMeta) return fromMeta;
      const fromText = extractUrlFromText(msg.content);
      if (fromText) return fromText;
    }
  }
  return undefined;
}

function extractUrlFromAssistantMetadata(
  metadata?: Record<string, unknown> | null
): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const layout = metadata.uiLayout as
    | { blocks?: Array<{ type: string; props?: Record<string, unknown> }> }
    | undefined;
  if (!layout?.blocks) return undefined;

  for (const block of layout.blocks) {
    if (block.type === 'key_value_list') {
      const items = (block.props?.items as Array<{ label?: string; value?: string }> | undefined) ?? [];
      for (const item of items) {
        if (item.label && /^url$|^domain$/i.test(item.label) && item.value?.trim()) {
          const v = item.value.trim();
          return v.startsWith('http') ? v : `https://${v}`;
        }
      }
    }
    const url = block.props?.url;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  return undefined;
}

export function extractScanIdFromText(text: string): string | undefined {
  const labeled = text.match(/Scan-ID[`\s:]+([0-9a-f-]{36})/i);
  if (labeled?.[1]) return labeled[1];

  const backtick = text.match(/`([0-9a-f-]{36})`/i);
  if (backtick?.[1]) return backtick[1];

  const uuids = text.match(UUID_PATTERN);
  if (uuids?.[0]) return uuids[0];

  return undefined;
}

function extractScanIdFromMetadata(metadata?: Record<string, unknown> | null): string | undefined {
  const layout = metadata?.uiLayout as
    | { blocks?: Array<{ type: string; props?: Record<string, unknown> }> }
    | undefined;
  if (!layout?.blocks) return undefined;

  for (const block of layout.blocks) {
    if (block.type !== 'key_value_list') continue;
    const items = (block.props?.items as Array<{ label?: string; value?: string }> | undefined) ?? [];
    for (const item of items) {
      if (item.label && /scan-?id/i.test(item.label) && item.value && UUID_PATTERN.test(item.value)) {
        return item.value;
      }
    }
  }
  return undefined;
}

export function extractScanIdFromHistory(
  history: ConversationMessageWithMeta[],
  currentPrompt: string
): string | undefined {
  const fromCurrent = extractScanIdFromText(currentPrompt);
  if (fromCurrent) return fromCurrent;

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role !== 'assistant') continue;
    const fromText = extractScanIdFromText(msg.content);
    if (fromText) return fromText;
    const fromMeta = extractScanIdFromMetadata(msg.metadata);
    if (fromMeta) return fromMeta;
  }
  return undefined;
}

export function extractContrastHexPair(
  text: string
): { foreground: string; background: string } | undefined {
  const hexes = [...text.matchAll(/#?([a-fA-F0-9]{6})\b/g)].map((m) => m[1]);
  if (hexes.length >= 2) {
    return { foreground: hexes[0], background: hexes[1] };
  }
  return undefined;
}
