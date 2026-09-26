import { describe, it, expect } from 'vitest';
import type { Prismion } from '@/lib/board/prismion';
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
