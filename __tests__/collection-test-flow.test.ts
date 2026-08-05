import { describe, expect, it } from 'vitest';
import {
  COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES,
  createJourneyQualityTemplate,
  createPageQualityIssuesTemplate,
  createPageQualityTemplate,
  deriveCollectionVerdict,
  deriveJourneyErrorVerdict,
  documentHasJourneySegment,
  evaluateGeoGatePassed,
  evaluateIssueGatePassed,
  evaluateScoreGatePassed,
  geoJobQueriesFromText,
  issueGateNode,
  resolveScoreForGate,
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

describe('createJourneyQualityTemplate', () => {
  it('builds start → action → success → scan → score_gate with embedded journeyFlow (Wave 5 first-class nodes)', () => {
    const doc = createJourneyQualityTemplate('https://acme.test/page');
    expect(doc.templateId).toBe(COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY);
    expect(doc.nodes.map((n) => n.kind)).toEqual([
      'start',
      'action',
      'success',
      'scan',
      'score_gate',
      'quality_ok',
      'abandon',
    ]);
    expect(documentHasJourneySegment(doc)).toBe(true);
    expect(doc.journeyFlow?.compileReady).toBe(true);
    expect(doc.journeyFlow?.nodes.map((n) => n.kind)).toEqual(['start', 'action', 'success']);
    expect(doc.journeyFlow?.nodes[0].urlKey).toBe('https://acme.test/page');
    expect(doc.journeyFlow?.edges[0]).toMatchObject({ from: 'n-start', to: 'n-action', kind: 'then' });
  });
});

describe('deriveCollectionVerdict', () => {
  it('passes when overallScore meets threshold (quality-only)', () => {
    const v = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 82,
      threshold: 70,
    });
    expect(v.status).toBe('complete');
    expect(v.flowCompleted).toBe(true);
    expect(v.pageEvidenceValid).toBe(true);
    expect(v.qualityPassed).toBe(true);
    expect(v.taskCompleted).toBe(true);
    expect(v.validEvidence).toBe(true);
    expect(v.collectionReady).toBe(true);
    expect(v.terminalKind).toBe('quality_ok');
    expect(v.hasJourneySegment).toBe(false);
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
    expect(v.pageEvidenceCaveat).toMatch(/Score fehlt/);
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

  it('requires taskCompleted when journey segment present', () => {
    const fail = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 90,
      hasJourneySegment: true,
      taskCompleted: false,
      journeyValidEvidence: true,
    });
    expect(fail.qualityPassed).toBe(true);
    expect(fail.collectionReady).toBe(false);
    expect(fail.taskCompleted).toBe(false);

    const pass = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 90,
      hasJourneySegment: true,
      taskCompleted: true,
      journeyValidEvidence: true,
    });
    expect(pass.collectionReady).toBe(true);
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

  it('paints journey node on journey-quality pass', () => {
    const doc = createJourneyQualityTemplate('https://x.test');
    const v = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 88,
      hasJourneySegment: true,
      taskCompleted: true,
      journeyValidEvidence: true,
    });
    const states = nodeStatesFromVerdict(doc, v, {
      startedAt: '',
      completedAt: null,
      scanId: 's1',
      url: 'https://x.test',
      status: 'completed',
      overallScore: 88,
      audionJobId: 'job-1',
    });
    expect(states['n-action']).toBe('done');
    expect(states['n-success']).toBe('done');
    expect(states['n-ok']).toBe('done');
  });

  it('deriveJourneyErrorVerdict marks journey failure', () => {
    const v = deriveJourneyErrorVerdict({ error: 'AUDION timeout' });
    expect(v.status).toBe('error');
    expect(v.hasJourneySegment).toBe(true);
    expect(v.taskCompleted).toBe(false);
    expect(v.collectionReady).toBe(false);
  });
});

describe('issue_gate Wave 3', () => {
  it('createPageQualityIssuesTemplate wires score → issue_gate → terminals', () => {
    const doc = createPageQualityIssuesTemplate('https://acme.test/');
    expect(doc.templateId).toBe(COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES);
    expect(doc.nodes.map((n) => n.kind)).toContain('issue_gate');
    const gate = issueGateNode(doc.nodes)!;
    expect(gate.gateCondition).toBe('critical_issues');
    expect(gate.minCount).toBe(1);
    expect(doc.edges.some((e) => e.source === 'n-score' && e.target === 'n-issues')).toBe(true);
  });

  it('evaluateIssueGatePassed for critical_issues', () => {
    const gate = {
      id: 'n-issues',
      kind: 'issue_gate' as const,
      label: 'Issues',
      gateCondition: 'critical_issues' as const,
      minCount: 1,
    };
    expect(evaluateIssueGatePassed(gate, { criticalCount: 0, seriousCount: 0, issueCount: 3 })).toBe(true);
    expect(evaluateIssueGatePassed(gate, { criticalCount: 2, seriousCount: 1, issueCount: 5 })).toBe(false);
  });

  it('evaluateIssueGatePassed for serious_issues / no_issues', () => {
    const serious = {
      id: 'n-issues',
      kind: 'issue_gate' as const,
      label: 'Issues',
      gateCondition: 'serious_issues' as const,
      minCount: 1,
    };
    expect(
      evaluateIssueGatePassed(serious, { criticalCount: 0, seriousCount: 0, issueCount: 2 })
    ).toBe(true);
    expect(
      evaluateIssueGatePassed(serious, { criticalCount: 0, seriousCount: 2, issueCount: 2 })
    ).toBe(false);
    const none = { ...serious, gateCondition: 'no_issues' as const };
    expect(evaluateIssueGatePassed(none, { criticalCount: 0, seriousCount: 0, issueCount: 0 })).toBe(
      true
    );
    expect(evaluateIssueGatePassed(none, { criticalCount: 0, seriousCount: 0, issueCount: 1 })).toBe(
      false
    );
  });

  it('fails quality when critical issues present despite score pass', () => {
    const doc = createPageQualityIssuesTemplate('https://x.test');
    const gate = issueGateNode(doc.nodes);
    const v = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 90,
      issueGate: gate,
      issueSignals: { criticalCount: 2, seriousCount: 0, issueCount: 4 },
    });
    expect(v.scorePassed).toBe(true);
    expect(v.issueGatePassed).toBe(false);
    expect(v.issueGateBranch).toBe('fail');
    expect(v.qualityPassed).toBe(false);
    expect(v.collectionReady).toBe(false);
    expect(v.terminalKind).toBe('abandon');
  });

  it('passes when score ok and zero criticals', () => {
    const doc = createPageQualityIssuesTemplate('https://x.test');
    const gate = issueGateNode(doc.nodes);
    const v = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: 90,
      issueGate: gate,
      issueSignals: { criticalCount: 0, seriousCount: 0, issueCount: 2 },
    });
    expect(v.issueGateBranch).toBe('pass');
    expect(v.qualityPassed).toBe(true);
    expect(v.collectionReady).toBe(true);
    const states = nodeStatesFromVerdict(doc, v, {
      startedAt: '',
      completedAt: null,
      scanId: 's1',
      url: 'https://x.test',
      status: 'completed',
      overallScore: 90,
      criticalCount: 0,
      issueGateBranch: 'pass',
    });
    expect(states['n-issues']).toBe('done');
    expect(states['n-ok']).toBe('done');
  });
});

describe('Wave 8A scoreKind', () => {
  it('resolveScoreForGate picks dimension', () => {
    const gate = {
      id: 'n-score',
      kind: 'score_gate' as const,
      label: 'Score',
      scoreKind: 'accessibility',
      threshold: 70,
    };
    expect(resolveScoreForGate(gate, 90, { accessibility: 55 })).toBe(55);
    expect(evaluateScoreGatePassed(gate, 55, true)).toBe(false);
    expect(evaluateScoreGatePassed(gate, 80, true)).toBe(true);
  });
});

describe('Wave 8B geo_gate', () => {
  it('evaluateGeoGatePassed cited_share / geo_fitness', () => {
    const cited = {
      id: 'n-geo-gate',
      kind: 'geo_gate' as const,
      label: 'GEO',
      gateCondition: 'cited_share_at_least' as const,
      threshold: 40,
    };
    expect(evaluateGeoGatePassed(cited, { citedShare: 55, geoFitness: null })).toBe(true);
    expect(evaluateGeoGatePassed(cited, { citedShare: 20, geoFitness: null })).toBe(false);

    const fitness = {
      ...cited,
      gateCondition: 'geo_fitness_at_least' as const,
      threshold: 70,
    };
    expect(evaluateGeoGatePassed(fitness, { citedShare: 90, geoFitness: 80 })).toBe(true);
    expect(evaluateGeoGatePassed(fitness, { citedShare: 90, geoFitness: 50 })).toBe(false);
  });

  it('deriveCollectionVerdict requires geo_gate when present', () => {
    const geoGate = {
      id: 'n-geo-gate',
      kind: 'geo_gate' as const,
      label: 'GEO Gate',
      gateCondition: 'cited_share_at_least' as const,
      threshold: 50,
    };
    const fail = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: null,
      requirePageScore: false,
      geoGate,
      geoSignals: { citedShare: 30, geoFitness: null },
    });
    expect(fail.geoGatePassed).toBe(false);
    expect(fail.qualityPassed).toBe(false);
    expect(fail.terminalKind).toBe('abandon');

    const pass = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: null,
      requirePageScore: false,
      geoGate,
      geoSignals: { citedShare: 70, geoFitness: 80 },
    });
    expect(pass.geoGatePassed).toBe(true);
    expect(pass.qualityPassed).toBe(true);
    expect(pass.collectionReady).toBe(true);
    expect(pass.citedShare).toBe(70);
  });

  it('geoJobQueriesFromText splits lines', () => {
    expect(geoJobQueriesFromText('a\n\nb\n c ')).toEqual(['a', 'b', 'c']);
    expect(geoJobQueriesFromText('')).toEqual([]);
  });
});
