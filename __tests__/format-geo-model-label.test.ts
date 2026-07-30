import { describe, expect, it } from 'vitest';
import { formatGeoModelLabel, sortGeoModelIds } from '@/lib/integrations/format-geo-model-label';

describe('format-geo-model-label', () => {
  it('formats known model prefixes', () => {
    expect(formatGeoModelLabel('gpt-5.4-nano')).toBe('GPT 5.4 nano');
    expect(formatGeoModelLabel('claude-sonnet-4')).toContain('Claude');
  });

  it('sorts model ids alphabetically', () => {
    expect(sortGeoModelIds(['gpt-5', 'claude-3', 'gemini-2'])).toEqual([
      'claude-3',
      'gemini-2',
      'gpt-5',
    ]);
  });
});
