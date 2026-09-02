import { describe, expect, it } from 'vitest';
import {
  COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
  COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
  createVaillantBarrierResearchTemplate,
  createVaillantInstallerDualPerspectiveTemplate,
  documentHasBrandMeasure,
  extractJourneyFlowFromDocument,
} from '@/lib/collection-test-flow';
import { buildVaillantGroupResearchBriefSeed } from '@/lib/demo/vaillant-group-knowledge-seed';
import {
  VAILLANT_GROUP_B2B_FACHPARTNER_URL,
  VAILLANT_GROUP_B2C_WAERMEPUMPE_URL,
  VAILLANT_GROUP_BRANDION_GUIDELINE_ID,
  VAILLANT_GROUP_PERSONA_MEISTER_KLAUS,
  VAILLANT_GROUP_PERSONA_SANDRA_ALTBAU,
  VAILLANT_GROUP_PLATFORM_PROJECT_ID,
  VAILLANT_GROUP_TG_UC1_ALTBAU,
  VAILLANT_GROUP_TG_UC2_HOMEOWNER,
  VAILLANT_GROUP_TG_UC2_INSTALLER,
  isVaillantGroupCollection,
} from '@/lib/demo/vaillant-group-mafo';

describe('Vaillant Group MaFo demo (UC1)', () => {
  it('targets Vaillant Group Collection only', () => {
    expect(isVaillantGroupCollection(VAILLANT_GROUP_PLATFORM_PROJECT_ID)).toBe(true);
    expect(isVaillantGroupCollection('00000000-0000-0000-0000-000000000099')).toBe(false);
  });

  it('creates showcase-lite UC1 barrier flow (Wer → Frage → Scan + Marke)', () => {
    const doc = createVaillantBarrierResearchTemplate({
      journeyUrl: VAILLANT_GROUP_B2C_WAERMEPUMPE_URL,
      guidelineId: VAILLANT_GROUP_BRANDION_GUIDELINE_ID,
    });
    expect(doc.templateId).toBe(COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH);
    const kinds = doc.nodes.map((n) => n.kind);
    expect(kinds.filter((k) => k === 'prompt')).toHaveLength(1);
    expect(kinds).toContain('scan');
    expect(kinds).toContain('guideline');
    expect(kinds).toContain('brand_measure');
    expect(kinds).not.toContain('observe');
    expect(kinds).not.toContain('message');
    expect(kinds).not.toContain('measure');
    expect(kinds).not.toContain('abandon');
    expect(kinds).not.toContain('compare');
    expect(doc.nodes.length).toBeLessThanOrEqual(10);
    expect(documentHasBrandMeasure(doc)).toBe(true);
    const start = doc.nodes.find((n) => n.kind === 'start');
    expect(start?.url).toContain('vaillant.de');
    const ziel = doc.nodes.find((n) => n.kind === 'zielgruppe');
    const persona = doc.nodes.find((n) => n.kind === 'persona');
    expect(ziel?.targetGroupId).toBe(VAILLANT_GROUP_TG_UC1_ALTBAU);
    expect(persona?.personaId).toBe(VAILLANT_GROUP_PERSONA_SANDRA_ALTBAU);
  });

  it('seeds UC1 research brief hypotheses', () => {
    const brief = buildVaillantGroupResearchBriefSeed();
    expect(brief.sections.some((s) => s.id === 'uc1-hypotheses')).toBe(true);
    expect(brief.sections.find((s) => s.id === 'uc1-hypotheses')?.bullets?.length).toBeGreaterThan(3);
  });

  it('seeds UC2 opportunity map sections', () => {
    const brief = buildVaillantGroupResearchBriefSeed();
    expect(brief.sections.some((s) => s.id === 'uc2-opportunity-map')).toBe(true);
    expect(brief.sections.some((s) => s.id === 'uc2-installer-needs')).toBe(true);
  });

  it('creates showcase-lite UC2 dual-perspective flow', () => {
    const doc = createVaillantInstallerDualPerspectiveTemplate();
    expect(doc.templateId).toBe(COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL);
    const kinds = doc.nodes.map((n) => n.kind);
    expect(kinds.filter((k) => k === 'zielgruppe').length).toBe(2);
    expect(kinds.filter((k) => k === 'persona').length).toBe(2);
    expect(kinds.filter((k) => k === 'start').length).toBe(2);
    expect(kinds.filter((k) => k === 'prompt').length).toBe(2);
    expect(kinds).toContain('scan');
    expect(kinds).not.toContain('abandon');
    expect(kinds).not.toContain('compare');
    expect(doc.nodes.length).toBeLessThanOrEqual(14);
    expect(documentHasBrandMeasure(doc)).toBe(true);
    const endkundeZg = doc.nodes.find((n) => n.id === 'n-zg-endkunde');
    const installerZg = doc.nodes.find((n) => n.id === 'n-zg-installer');
    expect(endkundeZg?.targetGroupId).toBe(VAILLANT_GROUP_TG_UC2_HOMEOWNER);
    expect(installerZg?.targetGroupId).toBe(VAILLANT_GROUP_TG_UC2_INSTALLER);
    expect(doc.nodes.find((n) => n.id === 'n-persona-ek')?.personaId).toBe(
      VAILLANT_GROUP_PERSONA_SANDRA_ALTBAU,
    );
    expect(doc.nodes.find((n) => n.id === 'n-persona-inst')?.personaId).toBe(
      VAILLANT_GROUP_PERSONA_MEISTER_KLAUS,
    );
  });

  it('extracts one Audion start per UC2 persona chain', () => {
    const doc = createVaillantInstallerDualPerspectiveTemplate();
    const endkunde = extractJourneyFlowFromDocument(
      doc,
      VAILLANT_GROUP_B2C_WAERMEPUMPE_URL,
      { personaNodeId: 'n-persona-ek' },
    );
    const installer = extractJourneyFlowFromDocument(
      doc,
      VAILLANT_GROUP_B2B_FACHPARTNER_URL,
      { personaNodeId: 'n-persona-inst' },
    );
    expect(endkunde?.nodes.filter((n) => n.kind === 'start')).toHaveLength(1);
    expect(installer?.nodes.filter((n) => n.kind === 'start')).toHaveLength(1);
    expect(endkunde?.nodes[0]?.urlKey).toContain('produkte/waermepumpen');
    expect(installer?.nodes[0]?.urlKey).toContain('myvaillantpro.de');
  });
});
