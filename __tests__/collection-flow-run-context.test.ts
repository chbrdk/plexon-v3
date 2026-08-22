import { describe, expect, it } from 'vitest';
import {
  actionKindForCatalogRoot,
  buildQueriesCatalogBundle,
  buildScanCatalogBundle,
  catalogPathFromOutHandle,
  catalogPortsForActionKind,
  emptyRunContext,
  evaluateCompareOp,
  evaluateCompareNode,
  resolveCatalogPath,
  resolveFlowParamString,
  resolveGeoJobMeasurementsFromContext,
  resolveNodeStringParams,
  resolveRunUrlChain,
  seedStartNodeIntoContext,
  setContextBundle,
} from '@/lib/collection-flow-run-context';

describe('collection-flow-run-context', () => {
  it('resolves nested catalog paths', () => {
    let ctx = emptyRunContext();
    ctx = setContextBundle(
      ctx,
      'scan',
      buildScanCatalogBundle({
        status: 'completed',
        overallScore: 88,
        url: 'https://a.test',
        scoresByKind: { accessibility: 72 },
        issues: { criticalCount: 1, seriousCount: 2, issueCount: 5 },
      })
    );
    expect(resolveCatalogPath(ctx, 'scan.overallScore')).toBe(88);
    expect(resolveCatalogPath(ctx, 'scan.scores.accessibility')).toBe(72);
    expect(resolveCatalogPath(ctx, 'scan.issues.criticalCount')).toBe(1);
  });

  it('evaluateCompareOp covers closed ops', () => {
    expect(evaluateCompareOp('gte', 70, 70)).toBe(true);
    expect(evaluateCompareOp('lt', 0, 1)).toBe(true);
    expect(evaluateCompareOp('eq', 'completed', 'completed')).toBe(true);
    expect(evaluateCompareOp('exists', 1, undefined)).toBe(true);
    expect(evaluateCompareOp('not_exists', undefined, undefined)).toBe(true);
    expect(evaluateCompareOp('gte', null, 70)).toBe(false);
  });

  it('evaluateCompareNode uses path + op + value', () => {
    const ctx = setContextBundle(emptyRunContext(), 'scan', {
      overallScore: 55,
      issues: { criticalCount: 0 },
    });
    const fail = evaluateCompareNode(
      { id: 'c1', kind: 'compare', label: 'Score', path: 'scan.overallScore', op: 'gte', value: 70 },
      ctx
    );
    expect(fail.passed).toBe(false);
    const pass = evaluateCompareNode(
      {
        id: 'c2',
        kind: 'compare',
        label: 'Crit',
        path: 'scan.issues.criticalCount',
        op: 'lt',
        value: 1,
      },
      ctx
    );
    expect(pass.passed).toBe(true);
  });

  it('catalogPortsForActionKind filters by writer root', () => {
    const scanPorts = catalogPortsForActionKind('scan');
    expect(scanPorts.every((p) => p.path.startsWith('scan.'))).toBe(true);
    expect(catalogPortsForActionKind('geo_job').some((p) => p.path === 'geo.citedShare')).toBe(
      true
    );
    expect(actionKindForCatalogRoot('domain')).toBe('domain_scan');
    expect(catalogPathFromOutHandle('out:scan.url')).toBe('scan.url');
    expect(catalogPathFromOutHandle('then')).toBe(null);
  });
});

describe('resolveFlowParamString + start seed', () => {
  it('seeds start config so scan URL expressions resolve', () => {
    const start = {
      id: 'n-start',
      kind: 'start' as const,
      label: 'Start',
      url: 'https://acme.test/landing',
      urlKey: 'https://acme.test/landing',
      maxSteps: 8,
    };
    const seeded = seedStartNodeIntoContext(emptyRunContext(), [start]);
    expect(seeded.startUrl).toBe('https://acme.test/landing');
    expect(seeded.ctx.outputs['n-start']?.url).toBe('https://acme.test/landing');
    expect(seeded.ctx.outputs.start?.url).toBe('https://acme.test/landing');

    const chain = resolveRunUrlChain({
      ctx: seeded.ctx,
      qualityUrlRaw: "{{ $('n-start').json.url }}",
      startUrl: seeded.startUrl,
    });
    expect(chain.qualityUrl).toBe('https://acme.test/landing');
    expect(chain.baseUrl).toBe('https://acme.test/landing');
  });

  it('falls back to start when quality URL is empty', () => {
    const start = {
      id: 'n-start',
      kind: 'start' as const,
      label: 'Start',
      url: 'https://fallback.test/',
    };
    const seeded = seedStartNodeIntoContext(emptyRunContext(), [start]);
    const chain = resolveRunUrlChain({
      ctx: seeded.ctx,
      qualityUrlRaw: '',
      startUrl: seeded.startUrl,
    });
    expect(chain.baseUrl).toBe('https://fallback.test/');
  });

  it('keeps literal quality URLs and does not forward unresolved placeholders', () => {
    expect(resolveFlowParamString(emptyRunContext(), 'https://literal.test')).toBe(
      'https://literal.test'
    );
    expect(resolveFlowParamString(emptyRunContext(), "{{ $('missing').json.url }}")).toBeNull();
  });

  it('resolveNodeStringParams replaces text and url templates', () => {
    const seeded = seedStartNodeIntoContext(emptyRunContext(), [
      {
        id: 'n-start',
        kind: 'start',
        label: 'Start',
        url: 'https://shop.test/',
      },
    ]);
    const action = resolveNodeStringParams(
      {
        id: 'n-action',
        kind: 'action',
        label: 'Action',
        text: "Open {{ $('n-start').json.url }} and continue",
        note: '{{ run.url }}',
      },
      setContextBundle(seeded.ctx, 'run', { url: 'https://shop.test/', startedAt: 'x' })
    );
    expect(action.text).toBe('Open https://shop.test/ and continue');
    expect(action.note).toBe('https://shop.test/');
  });

  it('stores GEO measurements on queries catalog without mixing into items', () => {
    const bundle = buildQueriesCatalogBundle(['q1'], { measurements: ['recall', 'live'] });
    expect(bundle.items).toEqual(['q1']);
    expect(bundle.measurements).toEqual(['recall', 'live']);
    const ctx = setContextBundle(emptyRunContext(), 'queries', bundle);
    expect(resolveGeoJobMeasurementsFromContext(ctx)).toEqual(['recall', 'live']);
    expect(resolveGeoJobMeasurementsFromContext(emptyRunContext())).toEqual(['recall']);
  });
});
