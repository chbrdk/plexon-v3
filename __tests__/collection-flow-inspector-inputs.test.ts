import { describe, expect, it } from 'vitest';
import {
  nodeOutputItems,
  nodeRefsFromRfNodes,
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
    expect(groups[0]?.items.some((i) => i.path.includes('overallScore'))).toBe(true);
  });
});

describe('nodeOutputItems', () => {
  it('prefers per-node bundle over catalog root', () => {
    let ctx = emptyRunContext();
    ctx = setContextBundle(ctx, 'scan', { overallScore: 70 }, 'n-scan');
    const rows = nodeOutputItems('n-scan', 'scan', ctx);
    expect(rows.some((r) => r.path.includes("n-scan") && r.value === '70')).toBe(true);
  });
});
