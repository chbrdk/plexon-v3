/**
 * AABB collision for Collection Flow RF nodes (Wave 15).
 * Pure helper — no @msqdx/react. Snaps on drag-stop / place, not while dragging.
 * @see specs/domain/collection-test-flow.md — Wave 15
 */

export type FlowCollisionRect = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Fallback card size matching compact CollectionFlowRfNode / FlowNodeCard. */
export const DEFAULT_FLOW_NODE_SIZE = { w: 220, h: 120 } as const;
export const DEFAULT_FLOW_NODE_GAP = 24;

const MAX_ITERATIONS = 50;

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  gap: number = 0
): boolean {
  const g = Math.max(0, gap);
  return (
    a.x < b.x + b.w + g &&
    a.x + a.w + g > b.x &&
    a.y < b.y + b.h + g &&
    a.y + a.h + g > b.y
  );
}

export function wouldOverlapFlowNodes(
  excludeId: string,
  position: { x: number; y: number },
  size: { w: number; h: number },
  others: FlowCollisionRect[],
  gap: number = DEFAULT_FLOW_NODE_GAP
): boolean {
  const candidate = { x: position.x, y: position.y, w: size.w, h: size.h };
  for (const o of others) {
    if (o.id === excludeId) continue;
    if (rectsOverlap(candidate, o, gap)) return true;
  }
  return false;
}

/**
 * Finds a non-overlapping position: try candidate, then shift vertically,
 * then start a new column every 10 steps (same idea as board-collision).
 */
export function findNonOverlappingFlowPosition(
  candidate: { x: number; y: number },
  size: { w: number; h: number },
  excludeId: string,
  others: FlowCollisionRect[],
  gap: number = DEFAULT_FLOW_NODE_GAP
): { x: number; y: number } {
  let x = candidate.x;
  let y = candidate.y;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (!wouldOverlapFlowNodes(excludeId, { x, y }, size, others, gap)) {
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

export function flowNodesToCollisionRects(
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    measured?: { width?: number; height?: number } | null;
    width?: number;
    height?: number;
  }>,
  fallback: { w: number; h: number } = DEFAULT_FLOW_NODE_SIZE
): FlowCollisionRect[] {
  return nodes.map((n) => ({
    id: n.id,
    x: n.position.x,
    y: n.position.y,
    w: n.measured?.width ?? n.width ?? fallback.w,
    h: n.measured?.height ?? n.height ?? fallback.h,
  }));
}

/**
 * Resolve positions for one or more moved nodes (multi-select drag-stop).
 * Processes in array order; later nodes see earlier resolved positions.
 */
export function resolveFlowNodePositions(
  moved: Array<{ id: string; position: { x: number; y: number }; size?: { w: number; h: number } }>,
  allRects: FlowCollisionRect[],
  gap: number = DEFAULT_FLOW_NODE_GAP
): Map<string, { x: number; y: number }> {
  const resolved = new Map<string, { x: number; y: number }>();
  const movedIds = new Set(moved.map((m) => m.id));
  // Ignore current footprints of nodes being moved — place them sequentially into free space.
  const working = allRects.filter((r) => !movedIds.has(r.id)).map((r) => ({ ...r }));

  for (const m of moved) {
    const size = m.size ?? DEFAULT_FLOW_NODE_SIZE;
    const pos = findNonOverlappingFlowPosition(m.position, size, m.id, working, gap);
    resolved.set(m.id, pos);
    working.push({ id: m.id, x: pos.x, y: pos.y, w: size.w, h: size.h });
  }
  return resolved;
}
