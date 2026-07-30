import type { Prismion } from '@msqdx/react';
import { wouldOverlap } from '@msqdx/react';

const MAX_ITERATIONS = 50;
const DEFAULT_GAP = 24;

/**
 * Finds a position for a new card that does not overlap any existing prismions.
 * Tries the candidate first; if it overlaps, shifts vertically (then optionally to a new column).
 * Used when placing new result cards and new prompt cards from the port.
 */
export function findNonOverlappingPosition(
  candidate: { x: number; y: number },
  size: { w: number; h: number },
  excludeId: string,
  prismions: Prismion[],
  gap: number = DEFAULT_GAP
): { x: number; y: number } {
  let x = candidate.x;
  let y = candidate.y;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (!wouldOverlap(excludeId, { x, y }, size, prismions)) {
      return { x, y };
    }
    y += size.h + gap;
    if (i > 0 && i % 10 === 0) {
      x += size.w + gap;
      y = candidate.y;
    }
  }
  return { x, y };
}
