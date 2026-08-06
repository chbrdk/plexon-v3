/**
 * Upstream INPUT groups + node OUTPUT schema for n8n-like node editor (Wave 21).
 * @see specs/domain/collection-test-flow.md
 */

import type { CollectionFlowNodeKind } from '@/lib/collection-test-flow';
import {
  CATALOG_PATH_OPTIONS,
  catalogPathFromOutHandle,
  catalogPortsForActionKind,
  catalogRootForActionKind,
  flattenAllContextOutputs,
  flattenContextForInspector,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context';
import {
  globalCatalogSchemaForest,
  mergeRunItemsIntoSchema,
  predictedSchemaForNodeOutput,
  predictedSchemaForSource,
} from '@/lib/collection-flow-output-schemas';
import type { SchemaTreeNode } from '../../msqdx-ui/packages/ui/src/components/SchemaTree';

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
  alias?: string;
};

export type UpstreamInputItem = {
  path: string;
  value: string;
  predicted?: boolean;
};

export type UpstreamInputGroup = {
  sourceNodeId: string;
  sourceLabel: string;
  sourceKind: string;
  edgeKind: 'flow' | 'bind' | 'catalog';
  bindPath?: string;
  /** Nested schema tree (primary UI). */
  schema: SchemaTreeNode;
  /** Flat merge for tests / legacy. */
  items: UpstreamInputItem[];
  hasRunData: boolean;
};

function relativeCatalogPath(catalogPath: string): string {
  const dot = catalogPath.indexOf('.');
  return dot >= 0 ? catalogPath.slice(dot + 1) : catalogPath;
}

function bundleToItems(prefix: string, ctx: CollectionFlowRunContext, key: string): UpstreamInputItem[] {
  const rows = flattenContextForInspector(ctx, key);
  return rows.map((r) => ({
    path: r.key ? `${prefix}${r.key}` : prefix.replace(/\.$/, ''),
    value: r.value,
    predicted: false,
  }));
}

function dedupeItems(items: UpstreamInputItem[]): UpstreamInputItem[] {
  const seen = new Set<string>();
  const out: UpstreamInputItem[] = [];
  for (const row of items) {
    if (seen.has(row.path)) continue;
    seen.add(row.path);
    out.push(row);
  }
  return out;
}

/** Flat catalog rows (legacy / tests). */
export function predictedItemsForSource(
  sourceNodeId: string,
  kind: string,
  opts: { bindPath?: string; catalogHandlePath?: string | null; alias?: string } = {}
): UpstreamInputItem[] {
  const items: UpstreamInputItem[] = [];
  const add = (path: string, value: string) => {
    items.push({ path, value, predicted: true });
  };

  add(`$('${sourceNodeId}').json`, 'Object');

  if (kind === 'set' && opts.alias?.trim()) {
    add(`$('${sourceNodeId}').json.value`, 'any');
    add(opts.alias.trim(), 'alias');
  }

  let ports = catalogPortsForActionKind(kind);
  if (opts.catalogHandlePath) {
    ports = ports.filter((p) => p.path === opts.catalogHandlePath);
  } else if (opts.bindPath) {
    ports = ports.filter((p) => p.path === opts.bindPath);
  }

  for (const port of ports) {
    const rel = relativeCatalogPath(port.path);
    add(`$('${sourceNodeId}').json.${rel}`, port.label);
    add(port.path, port.label);
  }

  if (ports.length === 0) {
    const root = catalogRootForActionKind(kind);
    if (root) {
      for (const option of CATALOG_PATH_OPTIONS.filter((o) => o.group === root)) {
        const rel = relativeCatalogPath(option.path);
        add(`$('${sourceNodeId}').json.${rel}`, option.label);
        add(option.path, option.label);
      }
    } else if (
      kind === 'prompt' ||
      kind === 'action' ||
      kind === 'observe' ||
      kind === 'message' ||
      kind === 'measure'
    ) {
      add(`$('${sourceNodeId}').json.text`, 'string');
      add(`$('${sourceNodeId}').json.note`, 'string');
    }
  }

  return dedupeItems(items);
}

function mergePredictedWithRun(
  predicted: UpstreamInputItem[],
  run: UpstreamInputItem[]
): UpstreamInputItem[] {
  const byPath = new Map<string, UpstreamInputItem>();
  for (const row of predicted) byPath.set(row.path, row);
  for (const row of run) byPath.set(row.path, { ...row, predicted: false });
  return dedupeItems(Array.from(byPath.values()));
}

function runItemsForSource(
  sourceNodeId: string,
  kind: string,
  ctx: CollectionFlowRunContext,
  bindPath?: string
): UpstreamInputItem[] {
  const items: UpstreamInputItem[] = [];

  if (ctx.outputs[sourceNodeId]) {
    items.push(...bundleToItems(`$('${sourceNodeId}').json.`, ctx, sourceNodeId));
  }

  const root = catalogRootForActionKind(kind);
  if (root && ctx.outputs[root]) {
    items.push(...bundleToItems(`${root}.`, ctx, root));
  }

  if (bindPath) {
    const bindRoot = bindPath.split('.')[0] ?? '';
    const rel = bindPath.includes('.') ? bindPath.slice(bindRoot.length + 1) : '';
    const rows = flattenContextForInspector(ctx, bindRoot);
    const hit = rel
      ? rows.find((r) => r.key === rel || `${bindRoot}.${r.key}`.replace(/\.\[/g, '[') === bindPath)
      : rows[0];
    items.unshift({
      path: bindPath,
      value: hit?.value ?? '—',
      predicted: false,
    });
  }

  return dedupeItems(items);
}

export function upstreamInputsForNode(
  nodeId: string,
  edges: FlowInspectorEdgeRef[],
  nodeById: Map<string, FlowInspectorNodeRef>,
  ctx: CollectionFlowRunContext | null | undefined
): UpstreamInputGroup[] {
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
    const catalogHandlePath = catalogPathFromOutHandle(edge.sourceHandle ?? undefined);

    const opts = {
      bindPath: isBind ? bindPath : undefined,
      catalogHandlePath,
      alias: src.alias,
    };

    const predictedFlat = predictedItemsForSource(edge.source, src.kind, opts);
    const run =
      ctx?.outputs != null
        ? runItemsForSource(edge.source, src.kind, ctx, isBind ? bindPath : undefined)
        : [];
    const items = mergePredictedWithRun(predictedFlat, run);

    const schema = mergeRunItemsIntoSchema(
      predictedSchemaForSource(edge.source, src.kind, opts),
      items
    );

    groups.push({
      sourceNodeId: edge.source,
      sourceLabel: src.label || src.id,
      sourceKind: src.kind,
      edgeKind: isBind ? 'bind' : isCatalogOut ? 'catalog' : 'flow',
      bindPath: isBind ? bindPath : undefined,
      schema,
      items,
      hasRunData: run.length > 0,
    });
  }

  return groups;
}

export function nodeOutputSchema(
  nodeId: string,
  kind: CollectionFlowNodeKind | string,
  ctx: CollectionFlowRunContext | null | undefined,
  alias?: string
): SchemaTreeNode {
  const predicted = predictedSchemaForNodeOutput(nodeId, kind, alias);
  const flat = nodeOutputItems(nodeId, kind, ctx, alias);
  return mergeRunItemsIntoSchema(predicted, flat);
}

export function nodeOutputItems(
  nodeId: string,
  kind: CollectionFlowNodeKind | string,
  ctx: CollectionFlowRunContext | null | undefined,
  alias?: string
): UpstreamInputItem[] {
  if (!ctx?.outputs) {
    return predictedItemsForSource(nodeId, kind, {
      alias: kind === 'set' ? alias : undefined,
    });
  }

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
      return [{ path: key, value: String((bundle as { value: unknown }).value), predicted: false }];
    }
  }

  return predictedItemsForSource(nodeId, kind, { alias: kind === 'set' ? alias : undefined });
}

export function globalContextSchemaForest(
  ctx: CollectionFlowRunContext | null | undefined
): SchemaTreeNode[] {
  const forest = globalCatalogSchemaForest();
  if (!ctx?.outputs || Object.keys(ctx.outputs).length === 0) return forest;
  const leaves: UpstreamInputItem[] = flattenAllContextOutputs(ctx).map((o) => ({
    path: o.path,
    value: o.value,
    predicted: false,
  }));
  return forest.map((tree) => mergeRunItemsIntoSchema(tree, leaves));
}

export function predictedGlobalContextLeaves(): UpstreamInputItem[] {
  return CATALOG_PATH_OPTIONS.map((o) => ({
    path: o.path,
    value: o.label,
    predicted: true,
  }));
}

export function nodeRefsFromRfNodes(
  nodes: Array<{
    id: string;
    data?: { flowNode?: { label?: string; kind?: CollectionFlowNodeKind; alias?: string } };
  }>
): Map<string, FlowInspectorNodeRef> {
  const map = new Map<string, FlowInspectorNodeRef>();
  for (const n of nodes) {
    const flow = n.data?.flowNode;
    map.set(n.id, {
      id: n.id,
      label: flow?.label ?? n.id,
      kind: flow?.kind ?? 'prompt',
      alias: flow?.alias,
    });
  }
  return map;
}
