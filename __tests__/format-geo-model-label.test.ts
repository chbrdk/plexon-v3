import { describe, expect, it } from 'vitest';
import { formatGeoModelLabel, sortGeoModelIds } from '@/lib/integrations/format-geo-model-label';

describe('format-geo-model-label', () => {
  it('formats known model prefixes', () => {
    expect(formatGeoModelLabel('gpt-5.6-luna')).toBe('GPT 5.6 luna');
    expect(formatGeoModelLabel('claude-sonnet-5')).toContain('Claude');
    expect(formatGeoModelLabel('gemini-3.6-flash')).toContain('Gemini');
  });

  it('sorts model ids alphabetically', () => {
    expect(sortGeoModelIds(['gpt-5', 'claude-3', 'gemini-2'])).toEqual([
      'claude-3',
      'gemini-2',
      'gpt-5',
    ]);
  });
});
