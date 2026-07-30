import { describe, expect, it } from 'vitest';
import {
  domainFromEventQuickCheckUrl,
  normalizeEventQuickCheckUrl,
} from '@/lib/assistant/event-quick-check/event-quick-check-url';

describe('event quick check page helpers', () => {
  it('normalizes bare domains to https', () => {
    expect(normalizeEventQuickCheckUrl('bvik.org')).toBe('https://bvik.org');
    expect(normalizeEventQuickCheckUrl('https://bvik.org')).toBe('https://bvik.org');
  });

  it('extracts hostname from url', () => {
    expect(domainFromEventQuickCheckUrl('https://www.bvik.org/path')).toBe('www.bvik.org');
    expect(domainFromEventQuickCheckUrl('not-a-url')).toBeUndefined();
  });
});
