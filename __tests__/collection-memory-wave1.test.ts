import { describe, expect, it } from 'vitest';

import {
  ASSISTANT_REPORT_KP_SECTION_ID,
  buildAssistantReportKnowledgeSection,
} from '@/lib/assistant/knowledge-pack/distill-assistant-report';
import {
  buildVaillantFlowKnowledgeSection,
  VAILLANT_UC1_FLOW_KP_SECTION_ID,
  VAILLANT_UC2_FLOW_KP_SECTION_ID,
  vaillantFlowKnowledgeSectionId,
} from '@/lib/demo/vaillant-flow-knowledge-distillate';
import {
  COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
  COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
} from '@/lib/collection-test-flow';
import type { CollectionVerdict } from '@/lib/collection-test-flow';

function readyVerdict(overrides?: Partial<CollectionVerdict>): CollectionVerdict {
  return {
    status: 'complete',
    flowCompleted: true,
    terminalKind: 'quality_ok',
    terminalNodeId: 'n-ok',
    taskCompleted: true,
    pageEvidenceValid: true,
    pageEvidenceCaveat: null,
    validEvidence: true,
    scorePassed: true,
    issueGatePassed: true,
    issueGateBranch: null,
    geoGatePassed: true,
    geoGateBranch: null,
    comparePassed: true,
    compareResults: [],
    criticalCount: null,
    issueCount: null,
    citedShare: null,
    geoFitness: null,
    qualityPassed: true,
    collectionReady: true,
    hasJourneySegment: true,
    hasIssueGate: false,
    hasGeoGate: false,
    hasCompareGates: false,
    overallScore: 88,
    threshold: 70,
    blockers: [],
    summary: 'Flow completed with quality_ok.',
    ...overrides,
  };
}

describe('collection memory wave 1 section builders', () => {
  it('maps Vaillant template ids to stable section ids', () => {
    expect(vaillantFlowKnowledgeSectionId(COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH)).toBe(
      VAILLANT_UC1_FLOW_KP_SECTION_ID
    );
    expect(vaillantFlowKnowledgeSectionId(COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL)).toBe(
      VAILLANT_UC2_FLOW_KP_SECTION_ID
    );
    expect(vaillantFlowKnowledgeSectionId('other')).toBeNull();
  });

  it('builds Vaillant UC1 flow section with business question and verdict', () => {
    const section = buildVaillantFlowKnowledgeSection({
      templateId: COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
      flowId: 'flow-uc1',
      verdict: readyVerdict(),
      scanId: 'scan-1',
      overallScore: 88,
    });
    expect(section?.id).toBe(VAILLANT_UC1_FLOW_KP_SECTION_ID);
    expect(section?.plainText).toContain('Wärmepumpe');
    expect(section?.plainText).toContain('flow-uc1');
    expect(section?.bullets?.length).toBeGreaterThan(0);
  });

  it('builds assistant report section with stable id', () => {
    const section = buildAssistantReportKnowledgeSection({
      reportId: 'rep-1',
      conversationId: 'conv-1',
      sharePath: '/share/reports/tok',
      narrative: {
        title: 'Barrier Report',
        intro: 'Intro',
        executiveSummary: 'Summary text',
        fazit: 'Handeln.',
        recommendations: [{ title: 'CTA klarer machen' }],
        findings: [{ title: 'Trust gap', description: 'Fehlende Installateur-Sichtbarkeit' }],
      },
    });
    expect(section.id).toBe(ASSISTANT_REPORT_KP_SECTION_ID);
    expect(section.plainText).toContain('Summary text');
    expect(section.bullets).toContain('Trust gap: Fehlende Installateur-Sichtbarkeit');
  });
});
