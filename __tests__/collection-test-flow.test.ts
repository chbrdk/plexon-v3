import { describe, expect, it } from 'vitest';
import {
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
  createPageQualityTemplate,
  deriveCollectionVerdict,
  nodeStatesFromVerdict,
  scoreGateThreshold,
} from '@/lib/collection-test-flow';

describe('createPageQualityTemplate', () => {
  it('builds start → scan → score_gate → quality_ok|abandon', () => {
    const doc = createPageQualityTemplate('https://acme.test/');
    expect(doc.templateId).toBe(COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY);
    expect(doc.nodes.map((n) => n.kind)).toEqual([
      'start',
      'scan',
      'score_gate',
      'quality_ok',
      'abandon',
    ]);
    expect(doc.nodes.find((n) => n.kind === 'scan')?.url).toBe('https://acme.test/');
    expect(scoreGateThreshold(doc.nodes)).toBe(70);
    expect(doc.edges).toHaveLength(4);
    expect(doc.edges.filter((e) => e.when === 'pass' || e.when === 'fail')).toHaveLength(2);
  });
});

describe('deriveCollectionVerdict', () => {
  it('passes when overallScore meets threshold', () => {
    const v = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 82,
      threshold: 70,
    });
    expect(v.status).toBe('complete');
    expect(v.flowCompleted).toBe(true);
    expect(v.pageEvidenceValid).toBe(true);
    expect(v.qualityPassed).toBe(true);
    expect(v.collectionReady).toBe(true);
    expect(v.terminalKind).toBe('quality_ok');
  });

  it('fails quality when score below threshold', () => {
    const v = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 40,
      threshold: 70,
    });
    expect(v.qualityPassed).toBe(false);
    expect(v.collectionReady).toBe(false);
    expect(v.terminalKind).toBe('abandon');
    expect(v.pageEvidenceValid).toBe(true);
  });

  it('marks junk when overallScore missing', () => {
    const v = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: null,
      threshold: 70,
    });
    expect(v.pageEvidenceValid).toBe(false);
    expect(v.qualityPassed).toBe(false);
    expect(v.collectionReady).toBe(false);
    expect(v.pageEvidenceCaveat).toMatch(/overallScore/);
  });

  it('errors on failed scan status', () => {
    const v = deriveCollectionVerdict({
      scanStatus: 'failed',
      overallScore: null,
      blockers: ['timeout'],
    });
    expect(v.status).toBe('error');
    expect(v.flowCompleted).toBe(false);
    expect(v.collectionReady).toBe(false);
  });

  it('paints node states for pass path', () => {
    const doc = createPageQualityTemplate('https://x.test');
    const v = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 90,
    });
    const states = nodeStatesFromVerdict(doc, v);
    expect(states['n-start']).toBe('done');
    expect(states['n-scan']).toBe('done');
    expect(states['n-score']).toBe('done');
    expect(states['n-ok']).toBe('done');
    expect(states['n-abandon']).toBe('skipped');
  });
});
