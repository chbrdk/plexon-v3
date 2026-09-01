/**
 * Auto-layout for Collection Flow board nodes (left-to-right spine + vertical stack).
 * @see specs/domain/collection-test-flow.md — Wave 15 auto-layout
 */

import type { CollectionFlowEdge, CollectionFlowNode } from './collection-test-flow';
import { DEFAULT_FLOW_NODE_GAP, DEFAULT_FLOW_NODE_SIZE } from './collection-flow-collision';

export type CollectionFlowLayoutOptions = {
  gap?: number;
  nodeSize?: { w: number; h: number };
  originX?: number;
  originY?: number;
  /** Extra Y for `start` nodes (matches template rhythm). */
  startYOffset?: number;
};

const DEFAULT_ORIGIN_Y = 40;
const DEFAULT_START_Y_OFFSET = 80;

function isControlEdge(edge: CollectionFlowEdge): boolean {
  return (edge.edgeKind ?? 'then') !== 'bind';
}

/**
 * Layer nodes along control edges (then / parallel / when / otherwise), left-to-right with gap.
 * Returns a position for every node id.
 */
export function layoutCollectionFlowNodes(
  nodes: CollectionFlowNode[],
  edges: CollectionFlowEdge[],
  opts?: CollectionFlowLayoutOptions
): Map<string, { x: number; y: number }> {
  const gap = opts?.gap ?? DEFAULT_FLOW_NODE_GAP;
  const size = opts?.nodeSize ?? DEFAULT_FLOW_NODE_SIZE;
  const originX = opts?.originX ?? 0;
  const originY = opts?.originY ?? DEFAULT_ORIGIN_Y;
  const startYOffset = opts?.startYOffset ?? DEFAULT_START_Y_OFFSET;
  const stepX = size.w + gap;
  const stepY = size.h + gap;

  if (nodes.length === 0) return new Map();

  const nodeIds = new Set(nodes.map((n) => n.id));
  const controlEdges = edges.filter(
    (e) => isControlEdge(e) && nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  const preds = new Map<string, string[]>();
  const succs = new Map<string, CollectionFlowEdge[]>();
  for (const n of nodes) {
    preds.set(n.id, []);
    succs.set(n.id, []);
  }
  for (const e of controlEdges) {
    preds.get(e.target)!.push(e.source);
    succs.get(e.source)!.push(e);
  }

  const col = new Map<string, number>();
  for (const n of nodes) {
    if (preds.get(n.id)!.length === 0) col.set(n.id, 0);
  }

  // Relax columns along control edges (longest path).
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const e of controlEdges) {
      const sourceCol = col.get(e.source);
      if (sourceCol == null) continue;
      const kind = e.edgeKind ?? 'then';
      let targetCol = sourceCol + 1;
      if (kind === 'parallel') {
        const parallelTargets = (succs.get(e.source) ?? []).filter(
          (x) => (x.edgeKind ?? 'then') === 'parallel'
        );
        const siblingCols = parallelTargets
          .map((x) => col.get(x.target))
          .filter((c): c is number => c != null);
        if (siblingCols.length > 0) targetCol = Math.min(...siblingCols);
      }
      const prev = col.get(e.target) ?? 0;
      if (targetCol > prev) {
        col.set(e.target, targetCol);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Orphans / cycle leftovers — append after the main spine.
  let maxCol = 0;
  for (const c of col.values()) maxCol = Math.max(maxCol, c);
  for (const n of nodes) {
    if (!col.has(n.id)) col.set(n.id, maxCol + 1);
  }

  // Stable topo order for row stacking within a column.
  const inDeg = new Map<string, number>();
  for (const n of nodes) inDeg.set(n.id, preds.get(n.id)!.length);
  const queue = nodes
    .filter((n) => inDeg.get(n.id) === 0)
    .sort(
      (a, b) =>
        (a.position?.x ?? 0) - (b.position?.x ?? 0) ||
        (a.position?.y ?? 0) - (b.position?.y ?? 0) ||
        a.id.localeCompare(b.id)
    )
    .map((n) => n.id);
  const topo: string[] = [];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    topo.push(id);
    for (const e of succs.get(id) ?? []) {
      const t = e.target;
      inDeg.set(t, (inDeg.get(t) ?? 1) - 1);
      if (inDeg.get(t) === 0) queue.push(t);
    }
  }
  for (const n of nodes) {
    if (!seen.has(n.id)) topo.push(n.id);
  }

  const byColumn = new Map<number, string[]>();
  for (const id of topo) {
    const c = col.get(id) ?? 0;
    if (!byColumn.has(c)) byColumn.set(c, []);
    byColumn.get(c)!.push(id);
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const positions = new Map<string, { x: number; y: number }>();

  for (const c of [...byColumn.keys()].sort((a, b) => a - b)) {
    const ids = byColumn.get(c)!;
    ids.sort((a, b) => topo.indexOf(a) - topo.indexOf(b));
    ids.forEach((id, rowIndex) => {
      const node = nodeById.get(id)!;
      const x = originX + c * stepX;
      let y = originY + rowIndex * stepY;
      if (node.kind === 'start') y += startYOffset;
      positions.set(id, { x, y });
    });
  }

  return positions;
}
