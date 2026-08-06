/**
 * Nested output/input schemas for Collection Flow node editor (Wave 21+).
 * @see specs/domain/collection-test-flow.md
 */

import type { CollectionFlowNodeKind } from '@/lib/collection-test-flow';
import type { SchemaFieldType, SchemaTreeNode } from '../../msqdx-ui/packages/ui/src/components/SchemaTree';
import {
  CATALOG_PATH_OPTIONS,
  catalogRootForActionKind,
} from '@/lib/collection-flow-run-context';
import type { UpstreamInputItem } from '@/lib/collection-flow-inspector-inputs';

const ISSUE_ITEM_FIELDS: Array<{ key: string; type: SchemaFieldType }> = [
  { key: 'id', type: 'string' },
  { key: 'severity', type: 'string' },
  { key: 'ruleId', type: 'string' },
  { key: 'title', type: 'string' },
];

function inferLeafType(key: string): SchemaFieldType {
  if (key === 'items') return 'array';
  if (
    key.endsWith('Count') ||
    key.endsWith('Score') ||
    key === 'pageCount' ||
    key === 'personaCount' ||
    key === 'citedShare' ||
    key === 'geoFitness'
  ) {
    return 'number';
  }
  if (
    key === 'taskCompleted' ||
    key === 'validEvidence' ||
    key === 'allTaskCompleted'
  ) {
    return 'boolean';
  }
  return 'string';
}

function joinSchemaPath(base: string, segment: string): string {
  if (!base) return segment;
  return `${base}.${segment}`;
}

function ensureChild(
  parent: SchemaTreeNode,
  segment: string,
  fullPath: string,
  isLeaf: boolean
): SchemaTreeNode {
  if (!parent.children) parent.children = [];
  let child = parent.children.find((c) => c.key === segment);
  if (!child) {
    child = {
      id: fullPath,
      key: segment,
      path: fullPath,
      type: isLeaf ? inferLeafType(segment) : segment === 'items' ? 'array' : 'object',
      schema: true,
      children: isLeaf ? undefined : [],
    };
    parent.children.push(child);
  }
  return child;
}

function enrichIssuesArray(root: SchemaTreeNode): void {
  const walk = (node: SchemaTreeNode) => {
    if (node.key === 'issues' && node.type === 'object') {
      if (!node.children) node.children = [];
      let items = node.children.find((c) => c.key === 'items');
      if (!items) {
        items = {
          id: `${node.path}.items`,
          key: 'items',
          path: `${node.path}.items`,
          type: 'array',
          schema: true,
          children: [
            {
              id: `${node.path}.items[item]`,
              key: '[item]',
              path: `${node.path}.items[0]`,
              type: 'object',
              schema: true,
              children: ISSUE_ITEM_FIELDS.map((f) => ({
                id: `${node.path}.items[0].${f.key}`,
                key: f.key,
                path: `${node.path}.items[0].${f.key}`,
                type: f.type,
                schema: true,
              })),
            },
          ],
        };
        node.children.push(items);
      }
    }
    node.children?.forEach(walk);
  };
  walk(root);
}

function sortSchemaChildren(node: SchemaTreeNode): void {
  if (!node.children?.length) return;
  node.children.sort((a, b) => {
    const aBranch = Boolean(a.children?.length);
    const bBranch = Boolean(b.children?.length);
    if (aBranch !== bBranch) return aBranch ? -1 : 1;
    return a.key.localeCompare(b.key);
  });
  node.children.forEach(sortSchemaChildren);
}

/** Build nested schema from catalog dot-paths under a base expression path. */
export function buildSchemaFromCatalogPaths(
  basePath: string,
  catalogGroup: string,
  relativePaths: string[]
): SchemaTreeNode {
  const root: SchemaTreeNode = {
    id: basePath,
    key: basePath.includes('$(') ? basePath : catalogGroup,
    path: basePath,
    type: 'object',
    schema: true,
    children: [],
  };

  for (const rel of relativePaths) {
    const parts = rel.split('.').filter(Boolean);
    let parent = root;
    let acc = basePath;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLeaf = i === parts.length - 1;
      acc = joinSchemaPath(acc, part);
      parent = ensureChild(parent, part, acc, isLeaf);
    }
  }

  if (catalogGroup === 'scan' || catalogGroup === 'domain') {
    enrichIssuesArray(root);
  }

  sortSchemaChildren(root);

  return root;
}

function catalogRelativePaths(group: string): string[] {
  return CATALOG_PATH_OPTIONS.filter((o) => o.group === group).map((o) =>
    o.path.slice(group.length + 1)
  );
}

export function catalogSchemaTree(catalogGroup: string, basePath?: string): SchemaTreeNode {
  return buildSchemaFromCatalogPaths(
    basePath ?? catalogGroup,
    catalogGroup,
    catalogRelativePaths(catalogGroup)
  );
}

export function globalCatalogSchemaForest(): SchemaTreeNode[] {
  return (
    ['scan', 'domain', 'geo', 'journey', 'run', 'brief', 'competitors', 'persona', 'queries'] as const
  ).map((g) => catalogSchemaTree(g));
}

const JOURNEY_STEP_FIELDS: Array<{ key: string; type: SchemaFieldType }> = [
  { key: 'text', type: 'string' },
  { key: 'note', type: 'string' },
  { key: 'label', type: 'string' },
];

function schemaTreeFromFields(
  base: string,
  fields: Array<{ key: string; type: SchemaFieldType }>
): SchemaTreeNode {
  return {
    id: base,
    key: base,
    path: base,
    type: 'object',
    schema: true,
    children: fields.map((f) => ({
      id: `${base}.${f.key}`,
      key: f.key,
      path: `${base}.${f.key}`,
      type: f.type,
      schema: true,
    })),
  };
}

export function journeyStepSchemaTree(nodeId: string): SchemaTreeNode {
  return schemaTreeFromFields(`$('${nodeId}').json`, JOURNEY_STEP_FIELDS);
}

export function observeNodeSchemaTree(nodeId: string): SchemaTreeNode {
  return schemaTreeFromFields(`$('${nodeId}').json`, [
    ...JOURNEY_STEP_FIELDS,
    { key: 'observeSeconds', type: 'number' },
  ]);
}

export function measureNodeSchemaTree(nodeId: string): SchemaTreeNode {
  return schemaTreeFromFields(`$('${nodeId}').json`, [
    ...JOURNEY_STEP_FIELDS,
    { key: 'measureKey', type: 'string' },
    { key: 'answer', type: 'string' },
  ]);
}

export function startNodeSchemaTree(nodeId: string): SchemaTreeNode {
  return schemaTreeFromFields(`$('${nodeId}').json`, [
    { key: 'url', type: 'string' },
    { key: 'urlKey', type: 'string' },
    { key: 'maxSteps', type: 'number' },
    { key: 'personaId', type: 'string' },
    { key: 'personaName', type: 'string' },
    { key: 'segment', type: 'string' },
  ]);
}

export function personaConfigSchemaTree(nodeId: string): SchemaTreeNode {
  return schemaTreeFromFields(`$('${nodeId}').json`, [
    { key: 'personaId', type: 'string' },
    { key: 'personaName', type: 'string' },
  ]);
}

export function zielgruppeConfigSchemaTree(nodeId: string): SchemaTreeNode {
  return schemaTreeFromFields(`$('${nodeId}').json`, [
    { key: 'targetGroupId', type: 'string' },
    { key: 'targetGroupName', type: 'string' },
    { key: 'segment', type: 'string' },
  ]);
}

export function compareNodeSchemaTree(nodeId: string): SchemaTreeNode {
  return schemaTreeFromFields(`$('${nodeId}').json`, [
    { key: 'passed', type: 'boolean' },
    { key: 'actual', type: 'any' },
    { key: 'path', type: 'string' },
    { key: 'op', type: 'string' },
    { key: 'value', type: 'any' },
  ]);
}

export function gateNodeSchemaTree(nodeId: string): SchemaTreeNode {
  return schemaTreeFromFields(`$('${nodeId}').json`, [
    { key: 'matched', type: 'boolean' },
    { key: 'evidence', type: 'string' },
    { key: 'gateCondition', type: 'string' },
    { key: 'pattern', type: 'string' },
  ]);
}

export function setNodeSchemaTree(nodeId: string, alias?: string): SchemaTreeNode {
  const base = `$('${nodeId}').json`;
  const children: SchemaTreeNode[] = [
    {
      id: `${base}.value`,
      key: 'value',
      path: `${base}.value`,
      type: 'any',
      schema: true,
    },
  ];
  if (alias?.trim()) {
    children.push({
      id: alias.trim(),
      key: alias.trim(),
      path: alias.trim(),
      type: 'object',
      schema: true,
      children: [
        {
          id: `${alias.trim()}.value`,
          key: 'value',
          path: `${alias.trim()}.value`,
          type: 'any',
          schema: true,
        },
      ],
    });
  }
  return {
    id: base,
    key: base,
    path: base,
    type: 'object',
    schema: true,
    children,
  };
}

export function predictedSchemaForSource(
  sourceNodeId: string,
  kind: string,
  opts: { bindPath?: string; catalogHandlePath?: string | null; alias?: string } = {}
): SchemaTreeNode {
  if (kind === 'set') {
    return setNodeSchemaTree(sourceNodeId, opts.alias);
  }

  const root = catalogRootForActionKind(kind);
  if (root) {
    let relPaths = catalogRelativePaths(root);
    if (opts.catalogHandlePath) {
      const rel = opts.catalogHandlePath.slice(root.length + 1);
      relPaths = rel ? [rel] : relPaths;
    } else if (opts.bindPath?.startsWith(`${root}.`)) {
      const rel = opts.bindPath.slice(root.length + 1);
      relPaths = rel ? [rel] : relPaths;
    }
    return buildSchemaFromCatalogPaths(`$('${sourceNodeId}').json`, root, relPaths);
  }

  if (kind === 'start') return startNodeSchemaTree(sourceNodeId);
  if (kind === 'persona') return personaConfigSchemaTree(sourceNodeId);
  if (kind === 'zielgruppe') return zielgruppeConfigSchemaTree(sourceNodeId);
  if (kind === 'compare' || kind === 'score_gate' || kind === 'issue_gate' || kind === 'geo_gate') {
    return compareNodeSchemaTree(sourceNodeId);
  }
  if (kind === 'gate') return gateNodeSchemaTree(sourceNodeId);
  if (kind === 'observe') return observeNodeSchemaTree(sourceNodeId);
  if (kind === 'measure') return measureNodeSchemaTree(sourceNodeId);
  if (kind === 'prompt' || kind === 'action' || kind === 'message') {
    return journeyStepSchemaTree(sourceNodeId);
  }

  return journeyStepSchemaTree(sourceNodeId);
}

export function predictedSchemaForNodeOutput(
  nodeId: string,
  kind: CollectionFlowNodeKind | string,
  alias?: string
): SchemaTreeNode | null {
  if (kind === 'abandon' || kind === 'quality_ok') return null;
  if (kind === 'set') return setNodeSchemaTree(nodeId, alias);
  const root = catalogRootForActionKind(kind);
  if (root) return buildSchemaFromCatalogPaths(`$('${nodeId}').json`, root, catalogRelativePaths(root));
  if (kind === 'start') return startNodeSchemaTree(nodeId);
  if (kind === 'persona') return personaConfigSchemaTree(nodeId);
  if (kind === 'zielgruppe') return zielgruppeConfigSchemaTree(nodeId);
  if (kind === 'compare' || kind === 'score_gate' || kind === 'issue_gate' || kind === 'geo_gate') {
    return compareNodeSchemaTree(nodeId);
  }
  if (kind === 'gate') return gateNodeSchemaTree(nodeId);
  if (kind === 'observe') return observeNodeSchemaTree(nodeId);
  if (kind === 'measure') return measureNodeSchemaTree(nodeId);
  return journeyStepSchemaTree(nodeId);
}

/** Overlay run values onto schema nodes by matching insert paths. */
export function mergeRunItemsIntoSchema(
  root: SchemaTreeNode,
  items: UpstreamInputItem[]
): SchemaTreeNode {
  const byPath = new Map<string, UpstreamInputItem>();
  for (const item of items) {
    byPath.set(item.path, item);
    // Alias catalog ↔ node-json so either flat form can paint the tree.
    const nodeJson = item.path.match(/^\$\(\s*['"]([^'"]+)['"]\s*\)\.json(?:\.(.+))?$/i);
    if (nodeJson?.[2]) {
      byPath.set(nodeJson[2], item);
    }
    const catalog = item.path.match(/^([a-zA-Z_][\w]*)\.(.+)$/);
    if (catalog && !item.path.startsWith('$')) {
      byPath.set(catalog[2]!, item);
    }
  }

  const lookup = (node: SchemaTreeNode): UpstreamInputItem | undefined => {
    const direct = byPath.get(node.path);
    if (direct) return direct;
    const nodeJson = node.path.match(/^\$\(\s*['"]([^'"]+)['"]\s*\)\.json(?:\.(.+))?$/i);
    if (nodeJson?.[2]) {
      const viaRel = byPath.get(nodeJson[2]);
      if (viaRel) return viaRel;
    }
    // Forest children may be shown with key-only depth; also try key as relative leaf.
    if (node.key && !node.key.startsWith('$') && !node.key.startsWith('[')) {
      return byPath.get(node.key);
    }
    return undefined;
  };

  const walk = (node: SchemaTreeNode): SchemaTreeNode => {
    const hit = lookup(node);
    const next: SchemaTreeNode = {
      ...node,
      value: hit && !hit.predicted ? hit.value : node.value,
      schema: hit ? Boolean(hit.predicted) : node.schema,
    };
    if (node.children?.length) {
      next.children = node.children.map(walk);
    }
    return next;
  };

  return walk(root);
}
