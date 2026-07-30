import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_HISTORY_TITLE_MAX_LINES,
  conversationDisplayTitle,
  filterConversationsByQuery,
  formatConversationUpdatedAt,
  truncateConversationTitle,
} from '@/lib/assistant/conversation-history';
import {
  ASSISTANT_CONVERSATION_QUERY_PARAM,
  PATH_ASSISTANT,
  pathAssistantChat,
} from '@/lib/constants';

describe('pathAssistantChat', () => {
  it('returns base path without conversation id', () => {
    expect(pathAssistantChat()).toBe(PATH_ASSISTANT);
    expect(pathAssistantChat(null)).toBe(PATH_ASSISTANT);
  });

  it('encodes conversation id in query param', () => {
    const id = 'abc-123';
    expect(pathAssistantChat(id)).toBe(
      `${PATH_ASSISTANT}?${ASSISTANT_CONVERSATION_QUERY_PARAM}=${id}`
    );
  });
});

describe('conversationDisplayTitle', () => {
  it('uses trimmed title when present', () => {
    expect(conversationDisplayTitle('  GEO Analyse  ', 'Untitled')).toBe('GEO Analyse');
  });

  it('falls back when title is empty', () => {
    expect(conversationDisplayTitle('   ', 'Untitled')).toBe('Untitled');
    expect(conversationDisplayTitle(null, 'Untitled')).toBe('Untitled');
  });
});

describe('truncateConversationTitle', () => {
  it('leaves short titles unchanged', () => {
    expect(truncateConversationTitle('GEO Analyse', 42)).toBe('GEO Analyse');
  });

  it('truncates long titles with ellipsis', () => {
    const long = 'kannst du mir die geo analyse vom projekt rheinland versicherung geben';
    const result = truncateConversationTitle(long, 42);
    expect(result.length).toBeLessThanOrEqual(42);
    expect(result.endsWith('…')).toBe(true);
    expect(long.startsWith(result.slice(0, -1))).toBe(true);
  });
});

describe('ASSISTANT_HISTORY_TITLE_MAX_LINES', () => {
  it('allows multi-line titles in the sidebar', () => {
    expect(ASSISTANT_HISTORY_TITLE_MAX_LINES).toBeGreaterThanOrEqual(2);
  });
});

describe('filterConversationsByQuery', () => {
  const items = [
    { id: '1', title: 'GEO Analyse', platformProjectId: null, createdAt: '', updatedAt: '' },
    { id: '2', title: null, platformProjectId: null, createdAt: '', updatedAt: '' },
    { id: '3', title: 'PageSpeed Check', platformProjectId: null, createdAt: '', updatedAt: '' },
  ];

  it('returns all conversations when query is empty', () => {
    expect(filterConversationsByQuery(items, '', 'Untitled')).toHaveLength(3);
    expect(filterConversationsByQuery(items, '   ', 'Untitled')).toHaveLength(3);
  });

  it('filters by display title case-insensitively', () => {
    expect(filterConversationsByQuery(items, 'geo', 'Untitled')).toHaveLength(1);
    expect(filterConversationsByQuery(items, 'pagespeed', 'Untitled')).toHaveLength(1);
  });

  it('matches untitled fallback label', () => {
    expect(filterConversationsByQuery(items, 'untitled', 'Untitled')).toHaveLength(1);
  });
});

describe('formatConversationUpdatedAt', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('formats recent updates as relative minutes', () => {
    const label = formatConversationUpdatedAt('2026-06-15T11:58:00.000Z', 'de', now);
    expect(label).toMatch(/Minute|min/i);
  });

  it('formats older updates as calendar date', () => {
    const label = formatConversationUpdatedAt('2026-05-01T08:00:00.000Z', 'de', now);
    expect(label).toMatch(/Mai|May/);
  });
});
