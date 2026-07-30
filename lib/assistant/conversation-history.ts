export type AssistantConversationSummary = {
  id: string;
  title: string | null;
  platformProjectId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function conversationDisplayTitle(
  title: string | null | undefined,
  untitledLabel: string
): string {
  const trimmed = title?.trim();
  return trimmed || untitledLabel;
}

/** localStorage key + layout widths for the collapsible history sidebar. */
export const ASSISTANT_HISTORY_COLLAPSED_STORAGE_KEY = 'plexon-assistant-history-collapsed';
export const ASSISTANT_HISTORY_EXPANDED_WIDTH_PX = 220;
export const ASSISTANT_HISTORY_COLLAPSED_WIDTH_PX = 44;
/** Visible title lines in expanded history rows (CSS line-clamp). */
export const ASSISTANT_HISTORY_TITLE_MAX_LINES = 3;

export function truncateConversationTitle(title: string, maxLength = 42): string {
  const trimmed = title.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Client-side filter for the history sidebar search field. */
export function filterConversationsByQuery(
  conversations: AssistantConversationSummary[],
  query: string,
  untitledLabel: string
): AssistantConversationSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return conversations;

  return conversations.filter((conversation) => {
    const label = conversationDisplayTitle(conversation.title, untitledLabel).toLowerCase();
    return label.includes(normalized);
  });
}

/**
 * Relative "updated" label for conversation list rows (locale-aware).
 */
export function formatConversationUpdatedAt(
  updatedAt: string | Date,
  locale: string,
  now: Date = new Date()
): string {
  const date = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSec < 60) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day');

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }).format(date);
}
