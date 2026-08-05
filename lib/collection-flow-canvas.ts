/**
 * Map CollectionTestFlowDocument ↔ React Flow nodes/edges (Wave 5).
 * Port of Audion `ux-flow-canvas.ts` pattern — no `@audion-v3/contracts` import here.
 * @see specs/domain/collection-test-flow.md — Wave 5–7 implementation notes
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
};

export type CollectionFlowRfEdgeData = { edgeKind: CollectionFlowEdgeKind };

export type CollectionFlowRfNode = RfNode<CollectionFlowRfNodeData>;
export type CollectionFlowRfEdge = RfEdge<CollectionFlowRfEdgeData>;

const EDGE_LABEL: Record<CollectionFlowEdgeKind, string> = {
  then: 'dann',
  when: 'wenn',
  otherwise: 'sonst',
  parallel: 'parallel',
};

export function edgeKindLabel(kind: CollectionFlowEdgeKind): string {
  return EDGE_LABEL[kind] ?? kind;
}

export function sourceHandleForEdgeKind(kind: CollectionFlowEdgeKind): string | undefined {
  if (kind === 'when' || kind === 'otherwise' || kind === 'then' || kind === 'parallel') {
    return kind;
  }
  return undefined;
}

const GATE_LIKE_KINDS = new Set<CollectionFlowNodeKind>([
  'gate',
  'score_gate',
  'issue_gate',
  'geo_gate',
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
  if (sourceKind !== 'score_gate' && sourceKind !== 'issue_gate' && sourceKind !== 'geo_gate') {
    return undefined;
  }
  if (kind === 'when') return 'pass';
  if (kind === 'otherwise') return 'fail';
  return undefined;
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

/** Palette — Family A (AUDION journey, closed set). */
export const PALETTE_JOURNEY_KINDS: CollectionFlowNodeKind[] = [
  'start',
  'prompt',
  'observe',
  'action',
  'gate',
  'message',
  'success',
  'abandon',
  'measure',
];

/** Palette — Family B (CHECKION quality). */
export const PALETTE_QUALITY_KINDS: CollectionFlowNodeKind[] = [
  'scan',
  'domain_scan',
  'geo_job',
  'score_gate',
  'issue_gate',
  'geo_gate',
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
  if (
    sourceHandle === 'when' ||
    sourceHandle === 'otherwise' ||
    sourceHandle === 'then' ||
    sourceHandle === 'parallel'
  ) {
    return sourceHandle;
  }
  if (GATE_LIKE_KINDS.has(sourceNode?.kind as CollectionFlowNodeKind)) {
    const outs = existingEdges.filter((e) => e.from === sourceId);
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
    kind === 'success' ||
    kind === 'measure'
  ) {
    return { ...base, text: '' };
  }
  return base;
}
