import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FLOW_NODE_SIZE,
  findNonOverlappingFlowPosition,
  rectsOverlap,
  resolveFlowNodePositions,
  wouldOverlapFlowNodes,
} from '@/lib/collection-flow-collision';

const size = DEFAULT_FLOW_NODE_SIZE;

describe('collection-flow-collision', () => {
  it('rectsOverlap detects AABB with gap', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 100, y: 0, w: 100, h: 100 }, 0)).toBe(
      false
    );
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 90, y: 0, w: 100, h: 100 }, 0)).toBe(
      true
    );
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 110, y: 0, w: 100, h: 100 }, 24)).toBe(
      true
    );
  });

  it('returns candidate when free', () => {
    const others = [{ id: 'a', x: 0, y: 0, w: size.w, h: size.h }];
    const pos = findNonOverlappingFlowPosition({ x: 400, y: 0 }, size, 'b', others);
    expect(pos).toEqual({ x: 400, y: 0 });
  });

  it('shifts vertically when overlapping', () => {
    const others = [{ id: 'a', x: 40, y: 0, w: size.w, h: size.h }];
    const pos = findNonOverlappingFlowPosition({ x: 40, y: 0 }, size, 'b', others);
    expect(pos.x).toBe(40);
    expect(pos.y).toBeGreaterThan(0);
    expect(wouldOverlapFlowNodes('b', pos, size, others)).toBe(false);
  });

  it('excludes self from overlap check', () => {
    const others = [{ id: 'self', x: 40, y: 40, w: size.w, h: size.h }];
    const pos = findNonOverlappingFlowPosition({ x: 40, y: 40 }, size, 'self', others);
    expect(pos).toEqual({ x: 40, y: 40 });
  });

  it('resolveFlowNodePositions handles multi-move in order', () => {
    const all = [
      { id: 'a', x: 0, y: 0, w: size.w, h: size.h },
      { id: 'b', x: 0, y: 0, w: size.w, h: size.h },
    ];
    const map = resolveFlowNodePositions(
      [
        { id: 'a', position: { x: 0, y: 0 } },
        { id: 'b', position: { x: 0, y: 0 } },
      ],
      all
    );
    expect(map.get('a')).toEqual({ x: 0, y: 0 });
    const b = map.get('b')!;
    expect(b.y).toBeGreaterThan(0);
    expect(
      wouldOverlapFlowNodes('b', b, size, [{ id: 'a', x: 0, y: 0, w: size.w, h: size.h }])
    ).toBe(false);
  });
});
