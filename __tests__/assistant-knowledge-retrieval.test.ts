import { describe, expect, it } from 'vitest';
import {
  extractQueryTerms,
  rankKnowledgeHits,
  scoreTextAgainstTerms,
  type KnowledgeHit,
} from '@/lib/assistant/knowledge-retrieval';

describe('knowledge-retrieval', () => {
  it('extracts meaningful query terms', () => {
    const terms = extractQueryTerms('was hast du zur Haftpflichtkasse');
    expect(terms).toContain('haftpflichtkasse');
    expect(terms).not.toContain('hast');
  });

  it('scores text by term overlap', () => {
    const score = scoreTextAgainstTerms('Haftpflichtversicherung für Privatkunden', [
      'haftpflicht',
      'privat',
    ]);
    expect(score).toBeGreaterThan(0);
  });

  it('ranks hits by relevance', () => {
    const hits: KnowledgeHit[] = [
      { source: 'audion', title: 'Allgemein', snippet: 'Versicherungsthemen', score: 0 },
      {
        source: 'audion',
        title: 'Haftpflicht',
        snippet: 'Die Haftpflichtkasse bietet Schutz für Privatkunden',
        score: 0,
      },
    ];
    const ranked = rankKnowledgeHits(hits, ['haftpflichtkasse'], 2);
    expect(ranked[0].title).toBe('Haftpflicht');
  });
});
