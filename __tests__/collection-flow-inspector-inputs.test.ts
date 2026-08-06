import { describe, expect, it } from 'vitest';
import {
  nodeOutputItems,
  nodeOutputSchema,
  nodeRefsFromRfNodes,
  predictedGlobalContextLeaves,
  predictedItemsForSource,
  upstreamInputsForNode,
} from '@/lib/collection-flow-inspector-inputs';
import { emptyRunContext, setContextBundle } from '@/lib/collection-flow-run-context';

describe('upstreamInputsForNode', () => {
  it('lists upstream node bundle and catalog root', () => {
    let ctx = emptyRunContext();
    ctx = setContextBundle(ctx, 'scan', { overallScore: 72, status: 'done' }, 'n-scan');
    const nodes = nodeRefsFromRfNodes([
      {
        id: 'n-scan',
        data: { flowNode: { id: 'n-scan', kind: 'scan', label: 'Page scan' } },
      },
      {
        id: 'n-compare',
        data: { flowNode: { id: 'n-compare', kind: 'compare', label: 'Cmp' } },
      },
    ]);
    const groups = upstreamInputsForNode(
      'n-compare',
      [{ source: 'n-scan', target: 'n-compare', sourceHandle: 'then', targetHandle: 'in' }],
      nodes,
      ctx
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.sourceLabel).toBe('Page scan');
    expect(groups[0]?.hasRunData).toBe(true);
    expect(groups[0]?.items.some((i) => i.path.includes('overallScore'))).toBe(true);
    expect(groups[0]?.schema.children?.some((c) => c.key === 'overallScore')).toBe(true);
  });

  it('shows nested scan schema before any run', () => {
    const nodes = nodeRefsFromRfNodes([
      {
        id: 'n-scan',
        data: { flowNode: { id: 'n-scan', kind: 'scan', label: 'Page scan' } },
      },
      {
        id: 'n-compare',
        data: { flowNode: { id: 'n-compare', kind: 'compare', label: 'Cmp' } },
      },
    ]);
    const groups = upstreamInputsForNode(
      'n-compare',
      [{ source: 'n-scan', target: 'n-compare', sourceHandle: 'then', targetHandle: 'in' }],
      nodes,
      null
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.hasRunData).toBe(false);
    expect(groups[0]?.schema.type).toBe('object');
    expect(groups[0]?.schema.children?.some((c) => c.key === 'overallScore' && c.schema)).toBe(true);
    expect(groups[0]?.items.some((i) => i.path.includes('overallScore') && i.predicted)).toBe(true);
    expect(groups[0]?.items.some((i) => i.path === 'scan.overallScore')).toBe(true);
  });
});

describe('predictedItemsForSource', () => {
  it('lists scan catalog paths for a page scan node', () => {
    const items = predictedItemsForSource('n-scan', 'scan');
    expect(items.some((i) => i.path === `$('n-scan').json.overallScore`)).toBe(true);
    expect(items.every((i) => i.predicted)).toBe(true);
  });
});

describe('predictedGlobalContextLeaves', () => {
  it('returns catalog picker paths', () => {
    const leaves = predictedGlobalContextLeaves();
    expect(leaves.some((l) => l.path === 'scan.overallScore')).toBe(true);
  });
});

describe('nodeOutputSchema', () => {
  it('returns nested schema for scan nodes', () => {
    const schema = nodeOutputSchema('n-scan', 'scan', null);
    expect(schema.type).toBe('object');
    expect(schema.children?.some((c) => c.key === 'overallScore')).toBe(true);
  });
});

describe('nodeOutputItems', () => {
  it('prefers per-node bundle over catalog root', () => {
    let ctx = emptyRunContext();
    ctx = setContextBundle(ctx, 'scan', { overallScore: 70 }, 'n-scan');
    const rows = nodeOutputItems('n-scan', 'scan', ctx);
    expect(rows.some((r) => r.path.includes('n-scan') && r.value === '70')).toBe(true);
  });

  it('falls back to schema when no run context', () => {
    const rows = nodeOutputItems('n-scan', 'scan', null);
    expect(rows.some((r) => r.predicted && r.path.includes('overallScore'))).toBe(true);
  });
});
