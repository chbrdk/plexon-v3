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
  return (['scan', 'domain', 'geo', 'journey', 'run'] as const).map((g) =>
    catalogSchemaTree(g)
  );
}

const JOURNEY_STEP_FIELDS: Array<{ key: string; type: SchemaFieldType }> = [
  { key: 'text', type: 'string' },
  { key: 'note', type: 'string' },
  { key: 'label', type: 'string' },
];

export function journeyStepSchemaTree(nodeId: string): SchemaTreeNode {
  const base = `$('${nodeId}').json`;
  return {
    id: base,
    key: base,
    path: base,
    type: 'object',
    schema: true,
    children: JOURNEY_STEP_FIELDS.map((f) => ({
      id: `${base}.${f.key}`,
      key: f.key,
      path: `${base}.${f.key}`,
      type: f.type,
      schema: true,
    })),
  };
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

  if (
    kind === 'prompt' ||
    kind === 'action' ||
    kind === 'observe' ||
    kind === 'message' ||
    kind === 'measure'
  ) {
    return journeyStepSchemaTree(sourceNodeId);
  }

  return journeyStepSchemaTree(sourceNodeId);
}

export function predictedSchemaForNodeOutput(
  nodeId: string,
  kind: CollectionFlowNodeKind | string,
  alias?: string
): SchemaTreeNode {
  if (kind === 'set') return setNodeSchemaTree(nodeId, alias);
  const root = catalogRootForActionKind(kind);
  if (root) return buildSchemaFromCatalogPaths(`$('${nodeId}').json`, root, catalogRelativePaths(root));
  return journeyStepSchemaTree(nodeId);
}

/** Overlay run values onto schema nodes by matching insert paths. */
export function mergeRunItemsIntoSchema(
  root: SchemaTreeNode,
  items: UpstreamInputItem[]
): SchemaTreeNode {
  const byPath = new Map(items.map((i) => [i.path, i]));

  const walk = (node: SchemaTreeNode): SchemaTreeNode => {
    const hit = byPath.get(node.path);
    const next: SchemaTreeNode = {
      ...node,
      value: hit && !hit.predicted ? hit.value : node.value,
      schema: hit ? hit.predicted : node.schema,
    };
    if (node.children?.length) {
      next.children = node.children.map(walk);
    }
    return next;
  };

  return walk(root);
}
