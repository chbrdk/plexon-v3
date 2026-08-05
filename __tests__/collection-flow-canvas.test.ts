import { describe, expect, it } from 'vitest';
import {
  createJourneyQualityIssuesTemplate,
  createJourneyQualityTemplate,
  createPageQualityTemplate,
  extractJourneyFlowFromDocument,
} from '@/lib/collection-test-flow';
import {
  PALETTE_JOURNEY_KINDS,
  PALETTE_QUALITY_KINDS,
  edgeKindLabel,
  flowToRf,
  newCollectionFlowNode,
  nextEdgeKindForSource,
  rfToDocument,
  type CollectionFlowRfEdge,
  type CollectionFlowRfNode,
} from '@/lib/collection-flow-canvas';

describe('flowToRf / rfToDocument roundtrip', () => {
  it('preserves node kinds/fields and edge kinds for a page-quality doc', () => {
    const doc = createPageQualityTemplate('https://acme.test/');
    const { nodes, edges } = flowToRf(doc);
    expect(nodes).toHaveLength(doc.nodes.length);
    expect(edges).toHaveLength(doc.edges.length);

    const scoreNode = nodes.find((n) => n.id === 'n-score')!;
    expect(scoreNode.data.flowNode.kind).toBe('compare');
    expect(scoreNode.data.flowNode.value).toBe(70);
    expect(scoreNode.data.flowNode.path).toBe('scan.overallScore');

    const passEdge = edges.find((e) => e.id === 'e-score-ok')!;
    expect(passEdge.sourceHandle).toBe('when');
    expect(passEdge.data?.edgeKind).toBe('when');
    const failEdge = edges.find((e) => e.id === 'e-score-abandon')!;
    expect(failEdge.sourceHandle).toBe('otherwise');

    const back = rfToDocument(doc, nodes, edges);
    expect(back.nodes.map((n) => n.kind)).toEqual(doc.nodes.map((n) => n.kind));
    const backScore = back.edges.find((e) => e.id === 'e-score-ok')!;
    expect(backScore.when).toBe('pass');
    expect(backScore.edgeKind).toBe('when');
    const backFail = back.edges.find((e) => e.id === 'e-score-abandon')!;
    expect(backFail.when).toBe('fail');
    expect(backFail.edgeKind).toBe('otherwise');
  });

  it('roundtrips first-class journey nodes (start/action/success) for journey-quality', () => {
    const doc = createJourneyQualityTemplate('https://acme.test/page');
    const { nodes, edges } = flowToRf(doc);
    expect(nodes.map((n) => n.data.flowNode.kind)).toEqual([
      'start',
      'action',
      'success',
      'scan',
      'compare',
      'quality_ok',
      'abandon',
    ]);

    const back = rfToDocument(doc, nodes, edges);
    expect(back.nodes.map((n) => n.kind)).toEqual(doc.nodes.map((n) => n.kind));
    expect(back.edges).toHaveLength(doc.edges.length);
    // journeyFlow carried over from base doc (Save doesn't re-derive it — the run route does).
    expect(back.journeyFlow?.nodes.map((n) => n.kind)).toEqual(['start', 'action', 'success']);
  });

  it('preserves gateCondition + pattern for a journey gate node round-trip', () => {
    const doc = createPageQualityTemplate('https://acme.test/');
    const gateNode = newCollectionFlowNode('gate', 'n-gate-test');
    doc.nodes.push({ ...gateNode, gateCondition: 'url_match', pattern: '/checkout' });
    const { nodes, edges } = flowToRf(doc);
    const back = rfToDocument(doc, nodes, edges);
    const gate = back.nodes.find((n) => n.id === 'n-gate-test')!;
    expect(gate.gateCondition).toBe('url_match');
    expect(gate.pattern).toBe('/checkout');
  });
});

describe('newCollectionFlowNode', () => {
  it('sets sensible defaults per kind', () => {
    expect(newCollectionFlowNode('start').maxSteps).toBe(8);
    expect(newCollectionFlowNode('score_gate').threshold).toBe(70);
    expect(newCollectionFlowNode('issue_gate').gateCondition).toBe('critical_issues');
    expect(newCollectionFlowNode('gate').gateCondition).toBe('goal_reached');
    expect(newCollectionFlowNode('observe').observeSeconds).toBe(30);
    expect(newCollectionFlowNode('action').text).toBe('');
  });

  it('generates unique ids across calls', () => {
    const a = newCollectionFlowNode('action');
    const b = newCollectionFlowNode('action');
    expect(a.id).not.toBe(b.id);
  });
});

describe('nextEdgeKindForSource', () => {
  it('alternates when/otherwise for gate-like sources, then for others', () => {
    const gateNode = newCollectionFlowNode('score_gate', 'n-score');
    const first = nextEdgeKindForSource(gateNode, [], 'n-score');
    expect(first).toBe('when');
    const second = nextEdgeKindForSource(gateNode, [{ from: 'n-score', kind: 'when' }], 'n-score');
    expect(second).toBe('otherwise');

    const actionNode = newCollectionFlowNode('action', 'n-action');
    expect(nextEdgeKindForSource(actionNode, [], 'n-action')).toBe('then');
  });

  it('respects an explicit sourceHandle override', () => {
    const actionNode = newCollectionFlowNode('action', 'n-action');
    expect(nextEdgeKindForSource(actionNode, [], 'n-action', 'parallel')).toBe('parallel');
  });
});

describe('edgeKindLabel', () => {
  it('maps closed edge kinds to German labels', () => {
    expect(edgeKindLabel('then')).toBe('dann');
    expect(edgeKindLabel('when')).toBe('wenn');
    expect(edgeKindLabel('otherwise')).toBe('sonst');
    expect(edgeKindLabel('parallel')).toBe('parallel');
  });
});

describe('palette kind sets', () => {
  it('splits journey vs quality kinds into disjoint closed sets', () => {
    expect(PALETTE_JOURNEY_KINDS).toEqual([
      'start',
      'prompt',
      'observe',
      'action',
      'gate',
      'message',
      'success',
      'abandon',
      'measure',
    ]);
    expect(PALETTE_QUALITY_KINDS).toEqual([
      'scan',
      'domain_scan',
      'geo_job',
      'compare',
      'quality_ok',
    ]);
    const overlap = PALETTE_JOURNEY_KINDS.filter((k) => (PALETTE_QUALITY_KINDS as string[]).includes(k));
    expect(overlap).toHaveLength(0);
  });

  it('defaults scanMode / compare / domain maxPages / geo defaults', () => {
    expect(newCollectionFlowNode('scan').scanMode).toBe('single');
    expect(newCollectionFlowNode('domain_scan').maxPages).toBe(50);
    expect(newCollectionFlowNode('compare').path).toBe('scan.overallScore');
    expect(newCollectionFlowNode('compare').op).toBe('gte');
    expect(newCollectionFlowNode('compare').value).toBe(70);
    expect(newCollectionFlowNode('score_gate').scoreKind).toBe('overall');
    expect(newCollectionFlowNode('geo_job').companyName).toBe('');
    expect(newCollectionFlowNode('geo_gate').gateCondition).toBe('cited_share_at_least');
    expect(newCollectionFlowNode('geo_gate').threshold).toBe(70);
  });
});

describe('extractJourneyFlowFromDocument', () => {
  it('extracts start/action/success nodes + edges before the first quality node', () => {
    const doc = createJourneyQualityTemplate('https://acme.test/page');
    const extracted = extractJourneyFlowFromDocument(doc, 'https://acme.test/page');
    expect(extracted?.nodes.map((n) => n.kind)).toEqual(['start', 'action', 'success']);
    expect(extracted?.edges).toHaveLength(2);
    expect(extracted?.compileReady).toBe(true);
    expect(extracted?.nodes[0].urlKey).toBe('https://acme.test/page');
  });

  it('extracts the journey segment even with a trailing issue_gate', () => {
    const doc = createJourneyQualityIssuesTemplate('https://acme.test/');
    const extracted = extractJourneyFlowFromDocument(doc, 'https://acme.test/');
    expect(extracted?.nodes.map((n) => n.kind)).toEqual(['start', 'action', 'success']);
  });

  it('is not compileReady (no edges) for a quality-only document — start node only, no journey steps', () => {
    const doc = createPageQualityTemplate('https://acme.test/');
    const extracted = extractJourneyFlowFromDocument(doc, 'https://acme.test/');
    expect(extracted?.nodes.map((n) => n.kind)).toEqual(['start']);
    expect(extracted?.edges).toHaveLength(0);
    expect(extracted?.compileReady).toBe(false);
  });

  it('re-derives edge kinds from Rf roundtrip nodes/edges (drag/edit before Testen)', () => {
    const doc = createJourneyQualityTemplate('https://acme.test/');
    const { nodes, edges } = flowToRf(doc);
    const edited = rfToDocument(doc, nodes as CollectionFlowRfNode[], edges as CollectionFlowRfEdge[]);
    const extracted = extractJourneyFlowFromDocument(edited, 'https://acme.test/');
    expect(extracted?.edges[0]).toMatchObject({ from: 'n-start', to: 'n-action', kind: 'then' });
  });
});
