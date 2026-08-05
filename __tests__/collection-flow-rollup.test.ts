import { describe, expect, it } from 'vitest';

import {
  buildCollectionReportMarkdown,
  buildCollectionSoftQNotes,
  collectionCrossProductRates,
  COLLECTION_FLOW_KP_SECTION_ID,
  buildCollectionKnowledgeSection,
  mergeEvaluationNotes,
} from '@/lib/collection-flow-rollup';
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
    summary: 'Ready — journey + quality passed',
    ...overrides,
  };
}

describe('collection-flow-rollup', () => {
  it('maps verdict booleans to 0/1 cross-product rates', () => {
    const rates = collectionCrossProductRates(
      readyVerdict({ collectionReady: false, qualityPassed: false })
    );
    expect(rates.taskCompleted).toBe(1);
    expect(rates.qualityPassed).toBe(0);
    expect(rates.collectionReady).toBe(0);
  });

  it('builds Soft-Q notes with Collection marker and rates', () => {
    const notes = buildCollectionSoftQNotes({
      verdict: readyVerdict(),
      flowId: 'flow-1',
      scanId: 'scan-1',
      overallScore: 88,
    });
    expect(notes[0]).toBe('--- Collection Test Flow rollup ---');
    expect(notes.some((n) => n.includes('collectionReady=1'))).toBe(true);
    expect(notes.some((n) => n.includes('checkionScanId=scan-1'))).toBe(true);
  });

  it('merges notes replacing prior Collection block', () => {
    const first = mergeEvaluationNotes(['Audion note'], [
      '--- Collection Test Flow rollup ---',
      'Collection collectionReady=0',
    ]);
    expect(first).toEqual([
      'Audion note',
      '--- Collection Test Flow rollup ---',
      'Collection collectionReady=0',
    ]);
    const second = mergeEvaluationNotes(first, [
      '--- Collection Test Flow rollup ---',
      'Collection collectionReady=1',
    ]);
    expect(second).toEqual([
      'Audion note',
      '--- Collection Test Flow rollup ---',
      'Collection collectionReady=1',
    ]);
  });

  it('builds report markdown and replaces prior Collection section', () => {
    const md = buildCollectionReportMarkdown({
      verdict: readyVerdict(),
      flowId: 'flow-1',
      platformProjectId: 'pp-1',
      scanId: 'scan-1',
      overallScore: 88,
      priorReport: '# Wave\n\n## Collection Test Flow\n\nold\n\n## Other\n\nkeep',
    });
    expect(md).toContain('## Collection Test Flow');
    expect(md).toContain('collectionReady | 1');
    expect(md).toContain('## Other');
    expect(md).not.toContain('\nold\n');
  });

  it('builds Knowledge Pack section with stable id', () => {
    const section = buildCollectionKnowledgeSection({
      verdict: readyVerdict(),
      flowId: 'flow-1',
      scanId: 'scan-1',
      overallScore: 88,
    });
    expect(section.id).toBe(COLLECTION_FLOW_KP_SECTION_ID);
    expect(section.title).toBe('Collection Test Flow');
    expect(section.bullets?.some((b) => b.includes('collectionReady=1'))).toBe(true);
  });
});
