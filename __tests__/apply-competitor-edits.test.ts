import { describe, expect, it } from 'vitest';
import { applyCompetitorEdits } from '@/lib/assistant/event-quick-check/apply-competitor-edits';

describe('applyCompetitorEdits', () => {
  it('normalizes and caps competitor domains', () => {
    expect(
      applyCompetitorEdits(['https://www.alpha.de', 'beta.com'], { competitors: ['gamma.de'] }, 3)
    ).toEqual(['gamma.de']);
  });

  it('falls back to draft when edits empty', () => {
    expect(applyCompetitorEdits(['rival.de', 'other.de'], undefined, 2)).toEqual(['rival.de', 'other.de']);
  });

  it('throws when no valid domains remain', () => {
    expect(() => applyCompetitorEdits([], { competitors: ['  '] }, 3)).toThrow('COMPETITORS_EMPTY');
  });
});
