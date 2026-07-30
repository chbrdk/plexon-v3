import { describe, it, expect, vi } from 'vitest';

vi.mock('@msqdx/react', () => {
  function wouldOverlap(
    excludeId: string,
    position: { x: number; y: number },
    size: { w: number; h: number },
    allPrismions: { id: string; position: { x: number; y: number }; size: { w: number; h: number } }[]
  ): boolean {
    const left = position.x;
    const right = position.x + size.w;
    const top = position.y;
    const bottom = position.y + size.h;
    for (const p of allPrismions) {
      if (p.id === excludeId) continue;
      const oLeft = p.position.x;
      const oRight = p.position.x + p.size.w;
      const oTop = p.position.y;
      const oBottom = p.position.y + p.size.h;
      if (left < oRight && right > oLeft && top < oBottom && bottom > oTop) return true;
    }
    return false;
  }
  return { wouldOverlap };
});

import { findNonOverlappingPosition } from '@/lib/board-collision';

/** Minimal shape for overlap check (id, position, size). */
function mockPrismion(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number
): { id: string; position: { x: number; y: number }; size: { w: number; h: number } } {
  return { id, position: { x, y }, size: { w, h } };
}

describe('findNonOverlappingPosition', () => {
  it('returns candidate position when no prismions overlap', () => {
    const prismions: Prismion[] = [];
    const candidate = { x: 10, y: 20 };
    const size = { w: 100, h: 80 };
    const result = findNonOverlappingPosition(candidate, size, 'new-id', prismions);
    expect(result).toEqual({ x: 10, y: 20 });
  });

  it('returns candidate position when existing card is far away', () => {
    const prismions: Prismion[] = [
      mockPrismion('other', 500, 500, 100, 100),
    ];
    const candidate = { x: 10, y: 20 };
    const size = { w: 100, h: 80 };
    const result = findNonOverlappingPosition(candidate, size, 'new-id', prismions);
    expect(result).toEqual({ x: 10, y: 20 });
  });

  it('shifts position when candidate overlaps an existing prismion', () => {
    const prismions: Prismion[] = [
      mockPrismion('other', 0, 0, 100, 100),
    ];
    const candidate = { x: 0, y: 0 };
    const size = { w: 100, h: 80 };
    const gap = 24;
    const result = findNonOverlappingPosition(candidate, size, 'new-id', prismions, gap);
    expect(result.x).toBe(0);
    expect(result.y).toBe(size.h + gap);
  });

  it('uses custom gap when provided', () => {
    const prismions: Prismion[] = [
      mockPrismion('other', 0, 0, 100, 100),
    ];
    const candidate = { x: 0, y: 0 };
    const size = { w: 100, h: 80 };
    const gap = 40;
    const result = findNonOverlappingPosition(candidate, size, 'new-id', prismions, gap);
    expect(result).toEqual({ x: 0, y: 120 });
  });
});
