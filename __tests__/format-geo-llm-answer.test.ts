import { describe, expect, it } from 'vitest';
import {
    formatGeoLlmAnswerForDisplay,
    hasGeoLlmAnswerContent,
} from '@/lib/integrations/format-geo-llm-answer';

describe('format-geo-llm-answer', () => {
    it('prefers stored answerText', () => {
    const text = formatGeoLlmAnswerForDisplay({
      answerText: 'Wera ist Marktführer.',
      citations: [{ domain: 'wera.de', position: 1 }],
    });
    expect(text).toBe('Wera ist Marktführer.');
  });

  it('extracts answer from legacy raw JSON excerpt', () => {
    const text = formatGeoLlmAnswerForDisplay({
      rawAnswerExcerpt: JSON.stringify({
        answer: 'Empfehlung: Wera und Knipex.',
        citations: [{ domain: 'wera.de', position: 1 }],
      }),
      citations: [{ domain: 'wera.de', position: 1 }],
    });
    expect(text).toContain('Wera');
  });

  it('falls back to formatted citations when no prose exists', () => {
    const text = formatGeoLlmAnswerForDisplay({
      citations: [
        { domain: 'wera.de', position: 1 },
        { domain: 'competitor.de', position: 2 },
      ],
    });
    expect(text).toContain('1. wera.de');
    expect(hasGeoLlmAnswerContent({ citations: [{ domain: 'a.de', position: 1 }] })).toBe(true);
  });
});
