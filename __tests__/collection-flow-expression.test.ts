import { describe, expect, it } from 'vitest';
import {
  expressionSyntaxIssue,
  formatExpressionForPath,
  formatNodeJsonExpression,
  parsePathSegments,
  resolveExpression,
  resolveExpressionScalar,
} from '@/lib/collection-flow-expression';
import {
  applySetNodes,
  emptyRunContext,
  evaluateCompareNode,
  resolveCatalogPath,
  setContextBundle,
} from '@/lib/collection-flow-run-context';

describe('collection-flow-expression (Wave 18)', () => {
  it('parses array and dot segments', () => {
    expect(parsePathSegments('scan.issues[0].ruleId')).toEqual([
      'scan',
      'issues',
      '0',
      'ruleId',
    ]);
  });

  it('resolves bare path, {{ }}, node json, and array index', () => {
    let ctx = emptyRunContext();
    ctx = setContextBundle(ctx, 'scan', {
      overallScore: 81,
      issues: {
        items: [{ ruleId: 'color-contrast', severity: 'critical' }],
      },
    });
    ctx = setContextBundle(ctx, 'n-scan', ctx.outputs.scan!, 'n-scan');

    expect(resolveExpressionScalar(ctx, 'scan.overallScore')).toBe(81);
    expect(resolveExpressionScalar(ctx, '{{ scan.overallScore }}')).toBe(81);
    expect(resolveExpressionScalar(ctx, '{{ scan.issues.items[0].ruleId }}')).toBe(
      'color-contrast'
    );
    expect(resolveExpressionScalar(ctx, "{{ $('n-scan').json.overallScore }}")).toBe(81);
    expect(resolveExpression(ctx, 'hello')).toBe('hello');
  });

  it('flags broken expression syntax', () => {
    expect(expressionSyntaxIssue('{{ scan.x')).toMatch(/Klammern/);
    expect(expressionSyntaxIssue('prefix {{ scan.x }}')).toMatch(/gesamte/);
    expect(expressionSyntaxIssue('scan.overallScore')).toBeNull();
  });

  it('format helpers wrap paths', () => {
    expect(formatExpressionForPath('scan.url')).toBe('{{ scan.url }}');
    expect(formatNodeJsonExpression('abc', 'overallScore')).toBe(
      "{{ $('abc').json.overallScore }}"
    );
  });

  it('evaluateCompareNode accepts expressions for path and value', () => {
    const ctx = setContextBundle(emptyRunContext(), 'scan', {
      overallScore: 90,
      thresholdHint: 70,
    });
    const pass = evaluateCompareNode(
      {
        id: 'c1',
        kind: 'compare',
        label: 'Score',
        path: '{{ scan.overallScore }}',
        op: 'gte',
        value: '{{ scan.thresholdHint }}',
      },
      ctx
    );
    expect(pass.passed).toBe(true);
    expect(pass.actual).toBe(90);
    expect(pass.expected).toBe(70);
  });

  it('resolveCatalogPath walks open array paths', () => {
    const ctx = setContextBundle(emptyRunContext(), 'scan', {
      issues: { items: [{ ruleId: 'x' }] },
    });
    expect(resolveCatalogPath(ctx, 'scan.issues.items[0].ruleId')).toBe('x');
  });

  it('applySetNodes writes aliases before compare', () => {
    let ctx = setContextBundle(emptyRunContext(), 'scan', { overallScore: 55 });
    ctx = applySetNodes(
      [
        {
          id: 's1',
          kind: 'set',
          label: 'Score alias',
          alias: 'score',
          path: 'scan.overallScore',
        },
      ],
      ctx
    );
    expect(ctx.outputs.score?.value).toBe(55);
    const cmp = evaluateCompareNode(
      {
        id: 'c1',
        kind: 'compare',
        label: 'via set',
        path: 'score.value',
        op: 'gte',
        value: 50,
      },
      ctx
    );
    expect(cmp.passed).toBe(true);
  });
});
