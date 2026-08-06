/**
 * Map CollectionTestFlowDocument ↔ React Flow nodes/edges (Wave 5).
 * Port of Audion `ux-flow-canvas.ts` pattern — no `@audion-v3/contracts` import here.
 * @see specs/domain/collection-test-flow.md — Wave 5–7 / 10 implementation notes
 */

import type { Edge as RfEdge, Node as RfNode } from '@xyflow/react';
import {
  DEFAULT_SCORE_GATE_THRESHOLD,
  type CollectionFlowEdge,
  type CollectionFlowEdgeKind,
  type CollectionFlowNode,
  type CollectionFlowNodeKind,
  type CollectionTestFlowDocument,
} from './collection-test-flow';
import type { FlowNodeRunOutput, FlowNodeRunState } from './collection-flow-run-progress';
import {
  CATALOG_BIND_PATH_HANDLE,
  catalogOutHandleId,
  catalogPathFromOutHandle,
  catalogPortsForActionKind,
  catalogRootFromPath,
  catalogRootForActionKind,
  isCatalogPath,
} from './collection-flow-run-context';
import { presetById } from './collection-flow-presets';
import {
  DEFAULT_FLOW_NODE_SIZE,
  findNonOverlappingFlowPosition,
  flowNodesToCollisionRects,
} from './collection-flow-collision';

export type CollectionFlowGateEvaluation = {
  matched?: boolean;
  evidence?: string | null;
  condition?: string | null;
};

export type CollectionFlowRfNodeData = {
  flowNode: CollectionFlowNode;
  /** Inline edit from inside the node (n8n-style). */
  onUpdate?: (nodeId: string, patch: Partial<CollectionFlowNode>) => void;
  /** Live run highlight from in-flow Testen (Wave 6). */
  runState?: FlowNodeRunState;
  /** Latest agent step text/image for this node during Testen. */
  runOutput?: FlowNodeRunOutput | null;
  /** Live gate evaluation for journey `gate` nodes (board mode). */
  gateEvaluation?: CollectionFlowGateEvaluation | null;
  /** Full test run in progress (disables editing / segment actions). */
  runBusy?: boolean;
  onManualGate?: (edgeKind: 'when' | 'otherwise') => void;
  onOutputToNote?: () => void;
  /** Focus note field → ensure node selected for inspector. */
  onOpenInspector?: () => void;
  /** Wave 11: Collection Audion catalog for persona / Zielgruppe pickers. */
  audionCatalog?: {
    personas: Array<{ id: string; name: string }>;
    targetGroups: Array<{ id: string; name: string; segment: string }>;
  } | null;
};

export type CollectionFlowRfEdgeData = {
  edgeKind: CollectionFlowEdgeKind;
  bindPath?: string;
};

export type CollectionFlowRfNode = RfNode<CollectionFlowRfNodeData>;
export type CollectionFlowRfEdge = RfEdge<CollectionFlowRfEdgeData>;

export const CONTROL_EDGE_KINDS = new Set<CollectionFlowEdgeKind>([
  'then',
  'when',
  'otherwise',
  'parallel',
]);

const EDGE_LABEL: Record<CollectionFlowEdgeKind, string> = {
  then: 'dann',
  when: 'wenn',
  otherwise: 'sonst',
  parallel: 'parallel',
  bind: 'bind',
};

export function edgeKindLabel(kind: CollectionFlowEdgeKind): string {
  return EDGE_LABEL[kind] ?? kind;
}

export function isControlEdgeKind(kind: CollectionFlowEdgeKind | undefined | null): boolean {
  return kind != null && CONTROL_EDGE_KINDS.has(kind);
}

export function sourceHandleForEdgeKind(kind: CollectionFlowEdgeKind): string | undefined {
  if (kind === 'when' || kind === 'otherwise' || kind === 'then' || kind === 'parallel') {
    return kind;
  }
  return undefined;
}

const GATE_LIKE_KINDS = new Set<CollectionFlowNodeKind>([
  'gate',
  'compare',
  'score_gate',
  'issue_gate',
  'geo_gate',
]);

const ACTION_PORT_KINDS = new Set<CollectionFlowNodeKind>([
  'scan',
  'domain_scan',
  'geo_job',
  'success',
  'journey',
]);

function edgeKindFromDoc(e: CollectionFlowEdge): CollectionFlowEdgeKind {
  if (e.edgeKind) return e.edgeKind;
  if (e.when === 'pass') return 'when';
  if (e.when === 'fail') return 'otherwise';
  return 'then';
}

/** Quality gates persist their branch via `when: pass|fail`; journey gates use edgeKind only. */
function whenFromEdgeKind(
  kind: CollectionFlowEdgeKind,
  sourceKind: CollectionFlowNodeKind | undefined
): 'pass' | 'fail' | undefined {
  if (
    sourceKind !== 'compare' &&
    sourceKind !== 'score_gate' &&
    sourceKind !== 'issue_gate' &&
    sourceKind !== 'geo_gate'
  ) {
    return undefined;
  }
  if (kind === 'when') return 'pass';
  if (kind === 'otherwise') return 'fail';
  return undefined;
}

function bindPathFromDocEdge(e: CollectionFlowEdge): string | undefined {
  if (e.bindPath && isCatalogPath(e.bindPath)) return e.bindPath.trim();
  return undefined;
}

function shortBindLabel(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] || path;
}

function bindEdgeStyle(): { strokeDasharray: string; strokeWidth: number } {
  return { strokeDasharray: '6 4', strokeWidth: 1.5 };
}

/** Map the persisted flow document to React Flow nodes/edges (positions are UI-only). */
export function flowToRf(doc: CollectionTestFlowDocument): {
  nodes: CollectionFlowRfNode[];
  edges: CollectionFlowRfEdge[];
} {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const nodes: CollectionFlowRfNode[] = doc.nodes.map((n, index) => ({
    id: n.id,
    type: 'collectionFlow',
    position: n.position ?? { x: (index % 4) * 300, y: Math.floor(index / 4) * 200 },
    data: { flowNode: { ...n } },
  }));
  const edges: CollectionFlowRfEdge[] = doc.edges.map((e) => {
    const kind = edgeKindFromDoc(e);
    if (kind === 'bind') {
      const bindPath =
        bindPathFromDocEdge(e) ??
        (typeof e.label === 'string' && isCatalogPath(e.label) ? e.label.trim() : undefined);
      const path = bindPath ?? 'scan.overallScore';
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: catalogOutHandleId(path),
        targetHandle: CATALOG_BIND_PATH_HANDLE,
        label: e.label ?? shortBindLabel(path),
        className: 'msqdx-flow-edge--bind',
        style: bindEdgeStyle(),
        data: { edgeKind: 'bind', bindPath: path },
      };
    }
    const source = byId.get(e.source);
    const handle = GATE_LIKE_KINDS.has(source?.kind as CollectionFlowNodeKind)
      ? kind === 'when' || kind === 'otherwise'
        ? kind
        : 'then'
      : 'then';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: handle,
      targetHandle: 'in',
      label: e.label ?? edgeKindLabel(kind),
      data: { edgeKind: kind },
    };
  });

  // Synthesize visual bind wires from compare.path when no bind edge exists yet.
  const boundTargets = new Set(
    edges.filter((e) => e.data?.edgeKind === 'bind').map((e) => e.target)
  );
  const producers = doc.nodes.map((n) => ({ id: n.id, kind: n.kind }));
  for (const n of doc.nodes) {
    if (n.kind !== 'compare' || !n.path || !isCatalogPath(n.path) || boundTargets.has(n.id)) {
      continue;
    }
    const sourceId = findProducerNodeIdForPath(producers, n.path);
    if (!sourceId) continue;
    edges.push(
      makeBindRfEdge({
        sourceId,
        targetId: n.id,
        path: n.path,
        id: `e-bind-synth-${n.id}`,
      })
    );
  }

  return { nodes, edges };
}

/** Map React Flow nodes/edges back to the persisted flow document (Save). */
export function rfToDocument(
  base: CollectionTestFlowDocument,
  nodes: CollectionFlowRfNode[],
  edges: CollectionFlowRfEdge[]
): CollectionTestFlowDocument {
  const cfNodes: CollectionFlowNode[] = nodes.map((n) => ({
    ...(n.data?.flowNode ?? { id: n.id, kind: 'action' as CollectionFlowNodeKind, label: n.id }),
    id: n.id,
    position: n.position,
  }));
  const byId = new Map(cfNodes.map((n) => [n.id, n]));
  const cfEdges: CollectionFlowEdge[] = edges.map((e) => {
    const fromHandle = e.sourceHandle;
    const catalogPath = catalogPathFromOutHandle(fromHandle);
    if (e.data?.edgeKind === 'bind' || catalogPath || e.targetHandle === CATALOG_BIND_PATH_HANDLE) {
      const path =
        e.data?.bindPath ??
        catalogPath ??
        (typeof e.label === 'string' && isCatalogPath(e.label) ? e.label.trim() : '');
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        edgeKind: 'bind' as const,
        bindPath: path || undefined,
        label: typeof e.label === 'string' ? e.label : shortBindLabel(path || 'bind'),
      };
    }
    const kindFromHandle: CollectionFlowEdgeKind | null =
      fromHandle === 'when' ||
      fromHandle === 'otherwise' ||
      fromHandle === 'then' ||
      fromHandle === 'parallel'
        ? fromHandle
        : null;
    const kind = (e.data?.edgeKind ?? kindFromHandle ?? 'then') as CollectionFlowEdgeKind;
    const source = byId.get(e.source);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      edgeKind: kind,
      when: whenFromEdgeKind(kind, source?.kind),
      label: typeof e.label === 'string' ? e.label : undefined,
    };
  });
  return {
    ...base,
    nodes: cfNodes,
    edges: cfEdges,
  };
}

/** True when connecting an action catalog output into compare `bind:path`. */
export function isCatalogBindConnection(
  sourceKind: CollectionFlowNodeKind | undefined,
  sourceHandle: string | null | undefined,
  targetKind: CollectionFlowNodeKind | undefined,
  targetHandle: string | null | undefined
): boolean {
  if (targetKind !== 'compare') return false;
  if (targetHandle !== CATALOG_BIND_PATH_HANDLE) return false;
  const path = catalogPathFromOutHandle(sourceHandle);
  if (!path) return false;
  if (!sourceKind || !ACTION_PORT_KINDS.has(sourceKind)) return false;
  const root = catalogRootFromPath(path);
  if (!root) return false;
  // success + opaque journey both write the journey.* catalog root (Wave 11).
  return catalogRootForActionKind(sourceKind) === root;
}

export function findProducerNodeIdForPath(
  nodes: Array<{ id: string; kind: CollectionFlowNodeKind }>,
  path: string
): string | null {
  const root = catalogRootFromPath(path);
  if (!root) return null;
  return (
    nodes.find((n) => ACTION_PORT_KINDS.has(n.kind) && catalogRootForActionKind(n.kind) === root)
      ?.id ?? null
  );
}

/**
 * Remove nodes (and incident edges) from an RF graph.
 * Clears compare `path` when a catalog bind edge to that compare is removed.
 */
export function removeNodesFromRfGraph(
  nodes: CollectionFlowRfNode[],
  edges: CollectionFlowRfEdge[],
  nodeIds: Iterable<string>
): { nodes: CollectionFlowRfNode[]; edges: CollectionFlowRfEdge[] } {
  const remove = new Set(nodeIds);
  if (remove.size === 0) return { nodes, edges };

  const clearedComparePaths = new Set<string>();
  for (const e of edges) {
    if (e.data?.edgeKind !== 'bind') continue;
    if (!remove.has(e.source) && !remove.has(e.target)) continue;
    if (!remove.has(e.target)) clearedComparePaths.add(e.target);
  }

  const nextEdges = edges.filter((e) => !remove.has(e.source) && !remove.has(e.target));
  const nextNodes = nodes
    .filter((n) => !remove.has(n.id))
    .map((n) => {
      if (!clearedComparePaths.has(n.id)) return n;
      const prev = n.data?.flowNode;
      if (!prev?.path) return n;
      return {
        ...n,
        data: { ...n.data, flowNode: { ...prev, path: undefined, id: n.id } },
      };
    });

  return { nodes: nextNodes, edges: nextEdges };
}

/**
 * Duplicate selected RF nodes with new ids, offset position.
 * Does not copy edges — author reconnects (Wave 12).
 */
export function duplicateNodesInRfGraph(
  nodes: CollectionFlowRfNode[],
  nodeIds: Iterable<string>,
  offset: { x: number; y: number } = { x: 40, y: 40 }
): { nodes: CollectionFlowRfNode[]; newIds: string[] } {
  const selected = new Set(nodeIds);
  const sources = nodes.filter((n) => selected.has(n.id));
  if (sources.length === 0) return { nodes, newIds: [] };

  nodeCounter += 1;
  const stamp = `${Date.now().toString(36)}-${nodeCounter}`;
  const newIds: string[] = [];
  const placed: CollectionFlowRfNode[] = [];
  const clones: CollectionFlowRfNode[] = sources.map((n, i) => {
    const flow = n.data.flowNode;
    const id = `n-${flow.kind}-${stamp}-${i}`;
    newIds.push(id);
    const candidate = { x: n.position.x + offset.x, y: n.position.y + offset.y };
    const rects = [
      ...flowNodesToCollisionRects([...nodes, ...placed]),
      ...placed.map((p) => ({
        id: p.id,
        x: p.position.x,
        y: p.position.y,
        w: DEFAULT_FLOW_NODE_SIZE.w,
        h: DEFAULT_FLOW_NODE_SIZE.h,
      })),
    ];
    const position = findNonOverlappingFlowPosition(
      candidate,
      DEFAULT_FLOW_NODE_SIZE,
      id,
      rects
    );
    const clone: CollectionFlowRfNode = {
      ...n,
      id,
      selected: true,
      position,
      data: {
        ...n.data,
        flowNode: { ...flow, id, label: `${flow.label || flow.kind} (Kopie)` },
      },
    };
    placed.push(clone);
    return clone;
  });

  const clearedSelection = nodes.map((n) =>
    selected.has(n.id) ? { ...n, selected: false } : n
  );
  return { nodes: [...clearedSelection, ...clones], newIds };
}

/**
 * Add a sibling Persona wired with `parallel` from the same Zielgruppe (Wave 13).
 * Authoring only — extract still uses the nearest single persona.
 */
export function addParallelPersonaSibling(
  nodes: CollectionFlowRfNode[],
  edges: CollectionFlowRfEdge[],
  anchorId: string
): { nodes: CollectionFlowRfNode[]; edges: CollectionFlowRfEdge[]; newId: string | null } {
  const anchor = nodes.find((n) => n.id === anchorId);
  if (!anchor) return { nodes, edges, newId: null };
  const kind = anchor.data.flowNode.kind;

  let sourceId: string | null = null;
  if (kind === 'zielgruppe') {
    sourceId = anchor.id;
  } else if (kind === 'persona') {
    const into = edges.find(
      (e) =>
        e.target === anchor.id &&
        (e.data?.edgeKind === 'then' || e.data?.edgeKind === 'parallel' || !e.data?.edgeKind)
    );
    sourceId = into?.source ?? null;
    if (!sourceId) {
      const zg = nodes.find((n) => n.data.flowNode.kind === 'zielgruppe');
      sourceId = zg?.id ?? null;
    }
  } else {
    return { nodes, edges, newId: null };
  }
  if (!sourceId) return { nodes, edges, newId: null };

  const flowNode = newCollectionFlowNode('persona');
  flowNode.label = 'Persona (parallel)';
  const candidate = {
    x: anchor.position.x + 40,
    y: anchor.position.y + 120,
  };
  const position = findNonOverlappingFlowPosition(
    candidate,
    DEFAULT_FLOW_NODE_SIZE,
    flowNode.id,
    flowNodesToCollisionRects(nodes)
  );
  const rfNode: CollectionFlowRfNode = {
    id: flowNode.id,
    type: 'collectionFlow',
    position,
    selected: true,
    data: { flowNode },
  };
  const edge: CollectionFlowRfEdge = {
    id: `e-parallel-${sourceId}-${flowNode.id}`,
    source: sourceId,
    target: flowNode.id,
    sourceHandle: 'parallel',
    targetHandle: 'in',
    label: edgeKindLabel('parallel'),
    data: { edgeKind: 'parallel' },
  };
  const cleared = nodes.map((n) => ({ ...n, selected: false }));
  return {
    nodes: [...cleared, rfNode],
    edges: [...edges, edge],
    newId: flowNode.id,
  };
}

/** Build / replace a bind RF edge for a compare node's catalog path. */
export function makeBindRfEdge(input: {
  sourceId: string;
  targetId: string;
  path: string;
  id?: string;
}): CollectionFlowRfEdge {
  const path = input.path.trim();
  return {
    id: input.id ?? `e-bind-${input.sourceId}-${input.targetId}`,
    source: input.sourceId,
    target: input.targetId,
    sourceHandle: catalogOutHandleId(path),
    targetHandle: CATALOG_BIND_PATH_HANDLE,
    label: shortBindLabel(path),
    className: 'msqdx-flow-edge--bind',
    style: bindEdgeStyle(),
    data: { edgeKind: 'bind', bindPath: path },
  };
}

/** Upsert bind edge for compare path; removes prior binds into the compare. */
export function syncBindEdgesForComparePath(
  edges: CollectionFlowRfEdge[],
  nodes: CollectionFlowRfNode[],
  compareNodeId: string,
  path: string | undefined | null
): CollectionFlowRfEdge[] {
  const without = edges.filter(
    (e) => !(e.target === compareNodeId && e.data?.edgeKind === 'bind')
  );
  const trimmed = path?.trim() ?? '';
  if (!trimmed || !isCatalogPath(trimmed)) return without;
  const producers = nodes.map((n) => ({
    id: n.id,
    kind: n.data.flowNode.kind,
  }));
  const sourceId = findProducerNodeIdForPath(producers, trimmed);
  if (!sourceId) return without;
  return [...without, makeBindRfEdge({ sourceId, targetId: compareNodeId, path: trimmed })];
}

/** Palette — Family A kinds (flat list for tests / back-compat). Prefer presets groups in UI. */
export const PALETTE_JOURNEY_KINDS: CollectionFlowNodeKind[] = [
  'zielgruppe',
  'persona',
  'start',
  'prompt',
  'observe',
  'action',
  'measure',
  'gate',
  'message',
  'success',
  'abandon',
];

/** Palette — Family B (CHECKION quality). Wave 9: compare replaces specialized gates. */
export const PALETTE_QUALITY_KINDS: CollectionFlowNodeKind[] = [
  'scan',
  'domain_scan',
  'geo_job',
  'compare',
  'quality_ok',
];

export const COLLECTION_SCAN_MODE_OPTIONS = ['single', 'deep'] as const;

export const COLLECTION_SCORE_KIND_OPTIONS = [
  'overall',
  'accessibility',
  'seo',
  'performance',
  'ux',
  'eco',
  'best_practices',
] as const;

export const COLLECTION_COMPARE_OP_OPTIONS = [
  'gte',
  'lte',
  'gt',
  'lt',
  'eq',
  'neq',
  'exists',
  'not_exists',
] as const;

export const ISSUE_GATE_CONDITION_OPTIONS = [
  'critical_issues',
  'no_critical_issues',
  'serious_issues',
  'no_serious_issues',
  'any_issues',
  'no_issues',
  'issue_rule_match',
] as const;

export const GEO_GATE_CONDITION_OPTIONS = [
  'cited_share_at_least',
  'cited_share_below',
  'geo_fitness_at_least',
  'geo_fitness_below',
] as const;

/** AUDION journey gate conditions (closed set) for the `gate` node inspector select. */
export const AUDION_GATE_OPTIONS = [
  'frustration_high',
  'url_match',
  'title_match',
  'consent_accepted',
  'consent_rejected',
  'goal_reached',
  'confusion_named',
  'time_elapsed',
] as const;

/** Prefer handle id, then when/otherwise for gates until both exist; else then. */
export function nextEdgeKindForSource(
  sourceNode: CollectionFlowNode | undefined,
  existingEdges: Array<{ from: string; kind: CollectionFlowEdgeKind }>,
  sourceId: string,
  sourceHandle?: string | null
): CollectionFlowEdgeKind {
  if (catalogPathFromOutHandle(sourceHandle)) {
    return 'bind';
  }
  if (
    sourceHandle === 'when' ||
    sourceHandle === 'otherwise' ||
    sourceHandle === 'then' ||
    sourceHandle === 'parallel'
  ) {
    return sourceHandle;
  }
  if (GATE_LIKE_KINDS.has(sourceNode?.kind as CollectionFlowNodeKind)) {
    const outs = existingEdges.filter((e) => e.from === sourceId && isControlEdgeKind(e.kind));
    if (!outs.some((e) => e.kind === 'when')) return 'when';
    if (!outs.some((e) => e.kind === 'otherwise')) return 'otherwise';
  }
  return 'then';
}

let nodeCounter = 0;

/** New node factory for the palette — sensible per-kind defaults. */
export function newCollectionFlowNode(kind: CollectionFlowNodeKind, id?: string): CollectionFlowNode {
  nodeCounter += 1;
  const nodeId = id ?? `n-${kind}-${Date.now().toString(36)}-${nodeCounter}`;
  const label = kind
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const base: CollectionFlowNode = { id: nodeId, kind, label };
  if (kind === 'gate') return { ...base, gateCondition: 'goal_reached' };
  if (kind === 'compare') {
    return {
      ...base,
      path: 'scan.overallScore',
      op: 'gte',
      value: DEFAULT_SCORE_GATE_THRESHOLD,
    };
  }
  if (kind === 'set') {
    return {
      ...base,
      label: 'Set',
      alias: 'alias',
      path: 'scan.overallScore',
    };
  }
  if (kind === 'score_gate') {
    return {
      ...base,
      gateCondition: 'score_at_least',
      threshold: DEFAULT_SCORE_GATE_THRESHOLD,
      scoreKind: 'overall',
    };
  }
  if (kind === 'issue_gate') {
    return { ...base, gateCondition: 'critical_issues', minCount: 1 };
  }
  if (kind === 'geo_gate') {
    return {
      ...base,
      gateCondition: 'cited_share_at_least',
      threshold: DEFAULT_SCORE_GATE_THRESHOLD,
    };
  }
  if (kind === 'observe') return { ...base, text: 'Schau dich kurz um.', observeSeconds: 30 };
  if (kind === 'start') return { ...base, url: '', urlKey: '', maxSteps: 8 };
  if (kind === 'persona') return { ...base, label: 'Persona' };
  if (kind === 'zielgruppe') return { ...base, label: 'Zielgruppe' };
  if (kind === 'measure') return { ...base, text: '', measureKey: 'overall' };
  if (kind === 'scan') return { ...base, url: '', scanMode: 'single' };
  if (kind === 'domain_scan') return { ...base, url: '', maxPages: 50 };
  if (kind === 'geo_job') {
    return {
      ...base,
      url: '',
      companyName: '',
      text: '',
    };
  }
  if (
    kind === 'prompt' ||
    kind === 'action' ||
    kind === 'message' ||
    kind === 'abandon' ||
    kind === 'success'
  ) {
    return { ...base, text: '' };
  }
  return base;
}

/** Create a node from a Wave 11 palette preset. */
export function newCollectionFlowNodeFromPreset(
  presetId: string,
  id?: string
): CollectionFlowNode {
  const preset = presetById(presetId);
  if (!preset) return newCollectionFlowNode('action', id);
  const base = newCollectionFlowNode(preset.kind, id);
  return {
    ...base,
    ...preset.defaults,
    id: base.id,
    kind: preset.kind,
  };
}

export { catalogPortsForActionKind, CATALOG_BIND_PATH_HANDLE, catalogOutHandleId };
