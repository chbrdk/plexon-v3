/**
 * Collection Flow Run Context — closed catalog paths + compare eval (Wave 9).
 * Spec: specs/domain/collection-test-flow.md
 */

import {
  DEFAULT_SCORE_GATE_THRESHOLD,
  type CollectionFlowNode,
  type IssueGateSignals,
} from '@/lib/collection-test-flow';

export const COLLECTION_FLOW_COMPARE_OPS = [
  'gte',
  'lte',
  'gt',
  'lt',
  'eq',
  'neq',
  'exists',
  'not_exists',
] as const;

export type CollectionFlowCompareOp = (typeof COLLECTION_FLOW_COMPARE_OPS)[number];

export type CatalogScalar = string | number | boolean | null;

export type CollectionFlowRunContext = {
  outputs: Record<string, Record<string, unknown>>;
};

export type CompareEvalResult = {
  nodeId: string;
  path: string;
  op: CollectionFlowCompareOp;
  expected: CatalogScalar | undefined;
  actual: CatalogScalar | undefined;
  passed: boolean;
};

/** Picker entries for the compare path select (closed catalog). */
export const CATALOG_PATH_OPTIONS: Array<{ path: string; label: string; group: string }> = [
  { path: 'scan.status', label: 'status', group: 'scan' },
  { path: 'scan.overallScore', label: 'overallScore', group: 'scan' },
  { path: 'scan.url', label: 'url', group: 'scan' },
  { path: 'scan.issueCount', label: 'issueCount', group: 'scan' },
  { path: 'scan.scores.accessibility', label: 'scores.accessibility', group: 'scan' },
  { path: 'scan.scores.seo', label: 'scores.seo', group: 'scan' },
  { path: 'scan.scores.performance', label: 'scores.performance', group: 'scan' },
  { path: 'scan.scores.ux', label: 'scores.ux', group: 'scan' },
  { path: 'scan.scores.eco', label: 'scores.eco', group: 'scan' },
  { path: 'scan.scores.best_practices', label: 'scores.best_practices', group: 'scan' },
  { path: 'scan.issues.criticalCount', label: 'issues.criticalCount', group: 'scan' },
  { path: 'scan.issues.seriousCount', label: 'issues.seriousCount', group: 'scan' },
  { path: 'scan.issues.issueCount', label: 'issues.issueCount', group: 'scan' },
  { path: 'domain.status', label: 'status', group: 'domain' },
  { path: 'domain.overallScore', label: 'overallScore', group: 'domain' },
  { path: 'domain.pageCount', label: 'pageCount', group: 'domain' },
  { path: 'domain.issueCount', label: 'issueCount', group: 'domain' },
  { path: 'domain.issues.criticalCount', label: 'issues.criticalCount', group: 'domain' },
  { path: 'domain.issues.seriousCount', label: 'issues.seriousCount', group: 'domain' },
  { path: 'domain.issues.issueCount', label: 'issues.issueCount', group: 'domain' },
  { path: 'geo.status', label: 'status', group: 'geo' },
  { path: 'geo.citedShare', label: 'citedShare', group: 'geo' },
  { path: 'geo.geoFitness', label: 'geoFitness', group: 'geo' },
  { path: 'geo.overallScore', label: 'overallScore', group: 'geo' },
  { path: 'geo.url', label: 'url', group: 'geo' },
  { path: 'journey.taskCompleted', label: 'taskCompleted', group: 'journey' },
  { path: 'journey.validEvidence', label: 'validEvidence', group: 'journey' },
  { path: 'journey.finalUrl', label: 'finalUrl', group: 'journey' },
  { path: 'run.url', label: 'url', group: 'run' },
  { path: 'run.startedAt', label: 'startedAt', group: 'run' },
];

const CATALOG_PATH_SET = new Set(CATALOG_PATH_OPTIONS.map((o) => o.path));

export function listCatalogPathsForPicker(): typeof CATALOG_PATH_OPTIONS {
  return CATALOG_PATH_OPTIONS;
}

export function isCatalogPath(path: string): boolean {
  return CATALOG_PATH_SET.has(path.trim());
}

export function emptyRunContext(): CollectionFlowRunContext {
  return { outputs: {} };
}

export function setContextBundle(
  ctx: CollectionFlowRunContext,
  root: string,
  bundle: Record<string, unknown>,
  nodeId?: string | null
): CollectionFlowRunContext {
  const outputs = { ...ctx.outputs, [root]: bundle };
  if (nodeId) outputs[nodeId] = bundle;
  return { outputs };
}

function getByPath(root: unknown, parts: string[]): unknown {
  let cur: unknown = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Resolve a catalog path against run context outputs (root-first). */
export function resolveCatalogPath(
  ctx: CollectionFlowRunContext,
  path: string
): CatalogScalar | undefined {
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split('.').filter(Boolean);
  if (parts.length < 1) return undefined;
  const [root, ...rest] = parts;
  const bundle = ctx.outputs[root!];
  if (!bundle) return undefined;
  if (rest.length === 0) return undefined;
  const raw = getByPath(bundle, rest);
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw;
  return undefined;
}

export function evaluateCompareOp(
  op: CollectionFlowCompareOp,
  actual: CatalogScalar | undefined,
  expected: CatalogScalar | undefined
): boolean {
  if (op === 'exists') return actual !== undefined && actual !== null;
  if (op === 'not_exists') return actual === undefined || actual === null;
  if (actual === undefined || actual === null) return false;

  if (op === 'eq') return actual === expected;
  if (op === 'neq') return actual !== expected;

  const aNum = typeof actual === 'number' ? actual : Number(actual);
  const eNum = typeof expected === 'number' ? expected : Number(expected);
  if (!Number.isFinite(aNum) || !Number.isFinite(eNum)) return false;
  if (op === 'gte') return aNum >= eNum;
  if (op === 'lte') return aNum <= eNum;
  if (op === 'gt') return aNum > eNum;
  if (op === 'lt') return aNum < eNum;
  return false;
}

export function evaluateCompareNode(
  node: CollectionFlowNode,
  ctx: CollectionFlowRunContext
): CompareEvalResult {
  const path = (node.path ?? 'scan.overallScore').trim();
  const op = (node.op ?? 'gte') as CollectionFlowCompareOp;
  const expected =
    op === 'exists' || op === 'not_exists'
      ? undefined
      : node.value !== undefined
        ? node.value
        : typeof node.threshold === 'number'
          ? node.threshold
          : DEFAULT_SCORE_GATE_THRESHOLD;
  const actual = resolveCatalogPath(ctx, path);
  const passed = evaluateCompareOp(op, actual, expected);
  return { nodeId: node.id, path, op, expected, actual, passed };
}

export function evaluateAllCompares(
  nodes: CollectionFlowNode[],
  ctx: CollectionFlowRunContext
): CompareEvalResult[] {
  return nodes.filter((n) => n.kind === 'compare').map((n) => evaluateCompareNode(n, ctx));
}

export function buildScanCatalogBundle(input: {
  status: string;
  overallScore: number | null;
  url: string;
  issueCount?: number | null;
  scoresByKind?: Record<string, number> | null;
  issues?: IssueGateSignals | null;
}): Record<string, unknown> {
  const scores: Record<string, number> = {};
  if (input.scoresByKind) {
    for (const [k, v] of Object.entries(input.scoresByKind)) {
      if (typeof v === 'number' && Number.isFinite(v)) scores[k] = v;
    }
  }
  const issues = input.issues ?? {
    criticalCount: 0,
    seriousCount: 0,
    issueCount: input.issueCount ?? 0,
  };
  return {
    status: input.status,
    overallScore: input.overallScore,
    url: input.url,
    issueCount: issues.issueCount,
    scores,
    issues: {
      criticalCount: issues.criticalCount,
      seriousCount: issues.seriousCount,
      issueCount: issues.issueCount,
    },
  };
}

export function buildDomainCatalogBundle(input: {
  status: string;
  overallScore: number | null;
  pageCount?: number | null;
  issueCount?: number | null;
  issues?: IssueGateSignals | null;
}): Record<string, unknown> {
  const issues = input.issues ?? {
    criticalCount: 0,
    seriousCount: 0,
    issueCount: input.issueCount ?? 0,
  };
  return {
    status: input.status,
    overallScore: input.overallScore,
    pageCount: input.pageCount ?? null,
    issueCount: issues.issueCount,
    issues: {
      criticalCount: issues.criticalCount,
      seriousCount: issues.seriousCount,
      issueCount: issues.issueCount,
    },
  };
}

export function buildGeoCatalogBundle(input: {
  status: string;
  citedShare: number | null;
  geoFitness: number | null;
  overallScore: number | null;
  url: string;
}): Record<string, unknown> {
  return {
    status: input.status,
    citedShare: input.citedShare,
    geoFitness: input.geoFitness,
    overallScore: input.overallScore,
    url: input.url,
  };
}

export function buildJourneyCatalogBundle(input: {
  taskCompleted: boolean;
  validEvidence: boolean;
  finalUrl: string | null;
}): Record<string, unknown> {
  return {
    taskCompleted: input.taskCompleted,
    validEvidence: input.validEvidence,
    finalUrl: input.finalUrl,
  };
}

export function flattenContextForInspector(
  ctx: CollectionFlowRunContext | null | undefined,
  root: string
): Array<{ key: string; value: string }> {
  if (!ctx?.outputs[root]) return [];
  const rows: Array<{ key: string; value: string }> = [];
  const walk = (prefix: string, val: unknown) => {
    if (val == null || typeof val !== 'object' || Array.isArray(val)) {
      rows.push({
        key: prefix,
        value: val === undefined ? '—' : val === null ? 'null' : String(val),
      });
      return;
    }
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      walk(prefix ? `${prefix}.${k}` : k, v);
    }
  };
  walk('', ctx.outputs[root]);
  return rows.filter((r) => r.key);
}
