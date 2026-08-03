import { describe, expect, it } from 'vitest';
import {
  mergeFacetData,
  normalizeCompetitiveData,
  productMayPublishFacet,
} from '@/lib/collection-knowledge-pack';

describe('collection knowledge pack merge', () => {
  it('unions competitors by host with cap', () => {
    const existing = normalizeCompetitiveData({
      competitors: [
        { host: 'a.com', source: 'human' },
        { host: 'b.com', source: 'audion' },
      ],
    });
    const merged = mergeFacetData('competitive', existing, {
      competitors: [
        { host: 'https://www.A.com/path', source: 'checkion', label: 'A' },
        { host: 'c.com', source: 'checkion' },
      ],
      category: 'SaaS',
    }) as ReturnType<typeof normalizeCompetitiveData>;
    expect(merged.category).toBe('SaaS');
    expect(merged.competitors.map((c) => c.host).sort()).toEqual(['a.com', 'b.com', 'c.com']);
    expect(merged.competitors.find((c) => c.host === 'a.com')?.label).toBe('A');
  });

  it('enforces facet publish ownership', () => {
    expect(productMayPublishFacet('research_brief', 'audion')).toBe(true);
    expect(productMayPublishFacet('research_brief', 'checkion')).toBe(false);
    expect(productMayPublishFacet('geo_context', 'checkion')).toBe(true);
    expect(productMayPublishFacet('brand', 'brandion')).toBe(false);
  });
});
