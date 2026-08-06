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
    } else if (kind === 'start') {
      add(`$('${sourceNodeId}').json.url`, 'string');
      add(`$('${sourceNodeId}').json.urlKey`, 'string');
      add(`$('${sourceNodeId}').json.maxSteps`, 'number');
    } else if (kind === 'compare' || kind === 'score_gate' || kind === 'issue_gate' || kind === 'geo_gate') {
      add(`$('${sourceNodeId}').json.passed`, 'boolean');
      add(`$('${sourceNodeId}').json.actual`, 'any');
    } else if (kind === 'gate') {
      add(`$('${sourceNodeId}').json.matched`, 'boolean');
      add(`$('${sourceNodeId}').json.evidence`, 'string');
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

function collectAncestorNodeIds(
  nodeId: string,
  edges: FlowInspectorEdgeRef[]
): string[] {
  const preds = new Map<string, Set<string>>();
  for (const e of edges) {
    const set = preds.get(e.target) ?? new Set<string>();
    set.add(e.source);
    preds.set(e.target, set);
  }

  const ancestors = new Set<string>();
  const stack = [...(preds.get(nodeId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (ancestors.has(id) || id === nodeId) continue;
    ancestors.add(id);
    for (const p of preds.get(id) ?? []) stack.push(p);
  }

  const ids = Array.from(ancestors);
  if (ids.length <= 1) return ids;

  // Topological order (sources first) so INPUT reads like the flow path.
  const indeg = new Map(ids.map((id) => [id, 0]));
  for (const id of ids) {
    for (const p of preds.get(id) ?? []) {
      if (ancestors.has(p)) indeg.set(id, (indeg.get(id) ?? 0) + 1);
    }
  }
  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  const ordered: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    ordered.push(id);
    for (const [target, parents] of preds) {
      if (!ancestors.has(target) || !parents.has(id)) continue;
      const next = (indeg.get(target) ?? 1) - 1;
      indeg.set(target, next);
      if (next === 0) queue.push(target);
    }
  }
  for (const id of ids) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

function directEdgeMeta(
  nodeId: string,
  sourceId: string,
  edges: FlowInspectorEdgeRef[]
): {
  bindPath?: string;
  catalogHandlePath?: string | null;
  edgeKind: UpstreamInputGroup['edgeKind'];
} {
  const edge = edges.find((e) => e.source === sourceId && e.target === nodeId);
  if (!edge) return { edgeKind: 'flow' };
  const bindPath =
    edge.data?.bindPath ??
    catalogPathFromOutHandle(edge.sourceHandle ?? undefined) ??
    undefined;
  const isBind = edge.data?.edgeKind === 'bind' || edge.targetHandle === 'bind:path';
  const isCatalogOut = Boolean(edge.sourceHandle?.startsWith('out:'));
  return {
    bindPath: isBind ? bindPath : undefined,
    catalogHandlePath: catalogPathFromOutHandle(edge.sourceHandle ?? undefined),
    edgeKind: isBind ? 'bind' : isCatalogOut ? 'catalog' : 'flow',
  };
}

export function upstreamInputsForNode(
  nodeId: string,
  edges: FlowInspectorEdgeRef[],
  nodeById: Map<string, FlowInspectorNodeRef>,
  ctx: CollectionFlowRunContext | null | undefined
): UpstreamInputGroup[] {
  const groups: UpstreamInputGroup[] = [];
  const ancestorIds = collectAncestorNodeIds(nodeId, edges);

  for (const sourceId of ancestorIds) {
    const src = nodeById.get(sourceId);
    if (!src) continue;

    const meta = directEdgeMeta(nodeId, sourceId, edges);
    // Narrow bind/catalog ports only for a direct edge; transitive ancestors show full output.
    const opts = {
      bindPath: meta.bindPath,
      catalogHandlePath: meta.edgeKind === 'catalog' ? meta.catalogHandlePath : undefined,
      alias: src.alias,
    };

    const predictedFlat = predictedItemsForSource(sourceId, src.kind, opts);
    const run =
      ctx?.outputs != null
        ? runItemsForSource(sourceId, src.kind, ctx, meta.bindPath)
        : [];
    const items = mergePredictedWithRun(predictedFlat, run);

    // Prefer the same schema the node would show in OUTPUT (shape + run overlay).
    const schema =
      nodeOutputSchema(sourceId, src.kind, ctx, src.alias) ??
      mergeRunItemsIntoSchema(predictedSchemaForSource(sourceId, src.kind, opts), items);

    groups.push({
      sourceNodeId: sourceId,
      sourceLabel: src.label || src.id,
      sourceKind: src.kind,
      edgeKind: meta.edgeKind,
      bindPath: meta.bindPath,
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
): SchemaTreeNode | null {
  const predicted = predictedSchemaForNodeOutput(nodeId, kind, alias);
  if (!predicted) return null;
  const flat = nodeOutputItems(nodeId, kind, ctx, alias);
  return mergeRunItemsIntoSchema(predicted, flat);
}

export function nodeOutputItems(
  nodeId: string,
  kind: CollectionFlowNodeKind | string,
  ctx: CollectionFlowRunContext | null | undefined,
  alias?: string
): UpstreamInputItem[] {
  const predicted = predictedItemsForSource(nodeId, kind, {
    alias: kind === 'set' ? alias : undefined,
  });
  if (!ctx?.outputs) return predicted;

  const run: UpstreamInputItem[] = [];
  if (ctx.outputs[nodeId]) {
    run.push(...bundleToItems(`$('${nodeId}').json.`, ctx, nodeId));
  }
  const root = catalogRootForActionKind(kind);
  if (root && ctx.outputs[root]) {
    run.push(...bundleToItems(`${root}.`, ctx, root));
  }
  if (run.length === 0) {
    for (const [key, bundle] of Object.entries(ctx.outputs)) {
      if (key === nodeId || key === root) continue;
      if (bundle && typeof bundle === 'object' && 'value' in bundle) {
        run.push({
          path: key,
          value: String((bundle as { value: unknown }).value),
          predicted: false,
        });
      }
    }
  }
  if (run.length === 0) return predicted;
  return mergePredictedWithRun(predicted, run);
}

/** Relative path under `$('nodeId').json` for inspector inserts. */
export function relativePathForInspectorInsert(path: string, sourceNodeId: string): string {
  const p = path.trim();
  if (!p) return '';
  const prefix = `$('${sourceNodeId}').json.`;
  if (p.startsWith(prefix)) return p.slice(prefix.length);
  if (p === `$('${sourceNodeId}').json`) return '';
  const nodeJson = p.match(/^\$\(\s*['"]([^'"]+)['"]\s*\)\.json(?:\.(.+))?$/i);
  if (nodeJson) return (nodeJson[2] ?? '').trim();
  // Catalog `scan.overallScore` → `overallScore`
  const dot = p.indexOf('.');
  if (dot > 0 && !p.startsWith('$') && !p.includes('{{')) return p.slice(dot + 1);
  return p.replace(/^\./, '');
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
