import { describe, expect, it } from 'vitest';
import { isAudionPersonaUuid } from '@/lib/integrations/audion-persona-geo-questions-client';

describe('isAudionPersonaUuid', () => {
  it('accepts real AUDION persona ids', () => {
    expect(isAudionPersonaUuid('a1b2c3d4-e5f6-4789-a012-3456789abcde')).toBe(true);
  });

  it('rejects local fallback ids', () => {
    expect(isAudionPersonaUuid('persona-1710000000000')).toBe(false);
    expect(isAudionPersonaUuid('p1')).toBe(false);
  });
});
