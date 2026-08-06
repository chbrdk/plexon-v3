/**
 * Upstream INPUT groups + node OUTPUT items for n8n-like node editor (Wave 21).
 * @see specs/domain/collection-test-flow.md
 */

import type { CollectionFlowNodeKind } from '@/lib/collection-test-flow';
import {
  catalogPathFromOutHandle,
  catalogRootForActionKind,
  flattenContextForInspector,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context';

export type FlowInspectorEdgeRef = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: { edgeKind?: string; bindPath?: string };
};

export type FlowInspectorNodeRef = {
  id: string;
  label: string;
  kind: CollectionFlowNodeKind | string;
};

export type UpstreamInputGroup = {
  sourceNodeId: string;
  sourceLabel: string;
  sourceKind: string;
  edgeKind: 'flow' | 'bind' | 'catalog';
  bindPath?: string;
  items: Array<{ path: string; value: string }>;
};

function bundleToItems(prefix: string, ctx: CollectionFlowRunContext, key: string): Array<{ path: string; value: string }> {
  const rows = flattenContextForInspector(ctx, key);
  return rows.map((r) => ({
    path: r.key ? `${prefix}${r.key}` : prefix.replace(/\.$/, ''),
    value: r.value,
  }));
}

function dedupeItems(items: Array<{ path: string; value: string }>): Array<{ path: string; value: string }> {
  const seen = new Set<string>();
  const out: Array<{ path: string; value: string }> = [];
  for (const row of items) {
    if (seen.has(row.path)) continue;
    seen.add(row.path);
    out.push(row);
  }
  return out;
}

/** Incoming edges → scoped INPUT tree rows for the left editor column. */
export function upstreamInputsForNode(
  nodeId: string,
  edges: FlowInspectorEdgeRef[],
  nodeById: Map<string, FlowInspectorNodeRef>,
  ctx: CollectionFlowRunContext | null | undefined
): UpstreamInputGroup[] {
  if (!ctx?.outputs) return [];
  const groups: UpstreamInputGroup[] = [];

  for (const edge of edges.filter((e) => e.target === nodeId)) {
    const src = nodeById.get(edge.source);
    if (!src) continue;

    const bindPath =
      edge.data?.bindPath ??
      catalogPathFromOutHandle(edge.sourceHandle ?? undefined) ??
      undefined;
    const isBind = edge.data?.edgeKind === 'bind' || edge.targetHandle === 'bind:path';
    const isCatalogOut = Boolean(edge.sourceHandle?.startsWith('out:'));

    const items: Array<{ path: string; value: string }> = [];

    if (ctx.outputs[edge.source]) {
      items.push(...bundleToItems(`$('${edge.source}').json.`, ctx, edge.source));
    }

    const root = catalogRootForActionKind(src.kind);
    if (root && ctx.outputs[root]) {
      items.push(...bundleToItems(`${root}.`, ctx, root));
    }

    if (isBind && bindPath && ctx) {
      const root = bindPath.split('.')[0] ?? '';
      const rel = bindPath.includes('.') ? bindPath.slice(root.length + 1) : '';
      const rows = flattenContextForInspector(ctx, root);
      const hit = rel
        ? rows.find((r) => r.key === rel || `${root}.${r.key}`.replace(/\.\[/g, '[') === bindPath)
        : rows[0];
      items.unshift({
        path: bindPath,
        value: hit?.value ?? '—',
      });
    }

    groups.push({
      sourceNodeId: edge.source,
      sourceLabel: src.label || src.id,
      sourceKind: src.kind,
      edgeKind: isBind ? 'bind' : isCatalogOut ? 'catalog' : 'flow',
      bindPath: isBind ? bindPath : undefined,
      items: dedupeItems(items),
    });
  }

  return groups;
}

/** OUTPUT column rows for the selected node. */
export function nodeOutputItems(
  nodeId: string,
  kind: CollectionFlowNodeKind | string,
  ctx: CollectionFlowRunContext | null | undefined
): Array<{ path: string; value: string }> {
  if (!ctx?.outputs) return [];

  if (ctx.outputs[nodeId]) {
    return bundleToItems(`$('${nodeId}').json.`, ctx, nodeId);
  }

  const root = catalogRootForActionKind(kind);
  if (root && ctx.outputs[root]) {
    return bundleToItems(`${root}.`, ctx, root);
  }

  for (const [key, bundle] of Object.entries(ctx.outputs)) {
    if (key === nodeId || key === root) continue;
    if (bundle && typeof bundle === 'object' && 'value' in bundle) {
      return [{ path: key, value: String((bundle as { value: unknown }).value) }];
    }
  }

  return [];
}

export function nodeRefsFromRfNodes(
  nodes: Array<{ id: string; data?: { flowNode?: { label?: string; kind?: CollectionFlowNodeKind } } }>
): Map<string, FlowInspectorNodeRef> {
  const map = new Map<string, FlowInspectorNodeRef>();
  for (const n of nodes) {
    const flow = n.data?.flowNode;
    map.set(n.id, {
      id: n.id,
      label: flow?.label ?? n.id,
      kind: flow?.kind ?? 'prompt',
    });
  }
  return map;
}
