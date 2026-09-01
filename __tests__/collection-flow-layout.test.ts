import { describe, expect, it } from 'vitest';
import {
  createPageQualityTemplate,
  createVaillantBarrierResearchTemplate,
} from '@/lib/collection-test-flow';
import { DEFAULT_FLOW_NODE_GAP, DEFAULT_FLOW_NODE_SIZE, rectsOverlap } from '@/lib/collection-flow-collision';
import { layoutCollectionFlowNodes } from '@/lib/collection-flow-layout';

describe('layoutCollectionFlowNodes', () => {
  it('lays out a quality spine left-to-right without overlap', () => {
    const doc = createPageQualityTemplate('https://example.com/page');
    const layout = layoutCollectionFlowNodes(doc.nodes, doc.edges);
    expect(layout.size).toBe(doc.nodes.length);

    const rects = [...layout.entries()].map(([id, pos]) => ({
      id,
      x: pos.x,
      y: pos.y,
      w: DEFAULT_FLOW_NODE_SIZE.w,
      h: DEFAULT_FLOW_NODE_SIZE.h,
    }));

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i]!, rects[j]!, DEFAULT_FLOW_NODE_GAP)).toBe(false);
      }
    }

    const scan = doc.nodes.find((n) => n.kind === 'scan');
    const start = doc.nodes.find((n) => n.kind === 'start');
    if (scan && start) {
      expect(layout.get(scan.id)!.x).toBeGreaterThan(layout.get(start.id)!.x);
    }
  });

  it('offsets start nodes vertically in journey templates', () => {
    const doc = createVaillantBarrierResearchTemplate();
    const layout = layoutCollectionFlowNodes(doc.nodes, doc.edges);
    const start = doc.nodes.find((n) => n.kind === 'start');
    const prompt = doc.nodes.find((n) => n.kind === 'prompt');
    expect(start).toBeTruthy();
    expect(prompt).toBeTruthy();
    expect(layout.get(start!.id)!.y).toBeGreaterThan(layout.get(prompt!.id)!.y);
  });
});
