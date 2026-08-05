import { describe, expect, it } from 'vitest';
import {
  buildScanCatalogBundle,
  emptyRunContext,
  evaluateCompareOp,
  evaluateCompareNode,
  resolveCatalogPath,
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
});
