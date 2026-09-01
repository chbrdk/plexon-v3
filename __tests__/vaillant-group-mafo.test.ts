import { describe, expect, it } from 'vitest';
import {
  COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
  createVaillantBarrierResearchTemplate,
  documentHasBrandMeasure,
} from '@/lib/collection-test-flow';
import { buildVaillantGroupResearchBriefSeed } from '@/lib/demo/vaillant-group-knowledge-seed';
import {
  VAILLANT_GROUP_B2C_WAERMEPUMPE_URL,
  VAILLANT_GROUP_BRANDION_GUIDELINE_ID,
  VAILLANT_GROUP_PLATFORM_PROJECT_ID,
  isVaillantGroupCollection,
} from '@/lib/demo/vaillant-group-mafo';

describe('Vaillant Group MaFo demo (UC1)', () => {
  it('targets Vaillant Group Collection only', () => {
    expect(isVaillantGroupCollection(VAILLANT_GROUP_PLATFORM_PROJECT_ID)).toBe(true);
    expect(isVaillantGroupCollection('00000000-0000-0000-0000-000000000099')).toBe(false);
  });

  it('creates barrier research flow template with journey + scan + brand', () => {
    const doc = createVaillantBarrierResearchTemplate({
      journeyUrl: VAILLANT_GROUP_B2C_WAERMEPUMPE_URL,
      guidelineId: VAILLANT_GROUP_BRANDION_GUIDELINE_ID,
    });
    expect(doc.templateId).toBe(COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH);
    const kinds = doc.nodes.map((n) => n.kind);
    expect(kinds).toContain('prompt');
    expect(kinds).toContain('scan');
    expect(kinds).toContain('guideline');
    expect(kinds).toContain('brand_measure');
    expect(documentHasBrandMeasure(doc)).toBe(true);
    const start = doc.nodes.find((n) => n.kind === 'start');
    expect(start?.url).toContain('vaillant.de');
  });

  it('seeds UC1 research brief hypotheses', () => {
    const brief = buildVaillantGroupResearchBriefSeed();
    expect(brief.sections.some((s) => s.id === 'uc1-hypotheses')).toBe(true);
    expect(brief.sections.find((s) => s.id === 'uc1-hypotheses')?.bullets?.length).toBeGreaterThan(3);
  });
});
