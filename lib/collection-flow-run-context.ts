/**
 * Collection Flow Run Context — catalog paths + compare eval (Wave 9) + open expressions (Wave 18).
 * Spec: specs/domain/collection-test-flow.md
 */

import {
  DEFAULT_SCORE_GATE_THRESHOLD,
  type CollectionFlowNode,
  type IssueGateSignals,
} from '@/lib/collection-test-flow';
import {
  resolveContextPath,
  resolveExpression,
  resolveExpressionScalar,
  resolveTemplateString,
  toCatalogScalar,
} from '@/lib/collection-flow-expression';

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

/** Picker entries for the compare path select (recommended catalog). */
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
  { path: 'journey.personaCount', label: 'personaCount', group: 'journey' },
  { path: 'journey.allTaskCompleted', label: 'allTaskCompleted', group: 'journey' },
  { path: 'run.url', label: 'url', group: 'run' },
  { path: 'run.startedAt', label: 'startedAt', group: 'run' },
  { path: 'brief.displayName', label: 'displayName', group: 'brief' },
  { path: 'brief.industry', label: 'industry', group: 'brief' },
  { path: 'brief.summary', label: 'summary', group: 'brief' },
  { path: 'brief.targetAudienceHint', label: 'targetAudienceHint', group: 'brief' },
  { path: 'brief.companyContext', label: 'companyContext', group: 'brief' },
  { path: 'competitors.items', label: 'items', group: 'competitors' },
  { path: 'persona.id', label: 'id', group: 'persona' },
  { path: 'persona.name', label: 'name', group: 'persona' },
  { path: 'persona.segment', label: 'segment', group: 'persona' },
  { path: 'queries.items', label: 'items', group: 'queries' },
  { path: 'queries.text', label: 'text', group: 'queries' },
];

const CATALOG_PATH_SET = new Set(CATALOG_PATH_OPTIONS.map((o) => o.path));

export const CATALOG_OUT_HANDLE_PREFIX = 'out:';
export const CATALOG_BIND_PATH_HANDLE = 'bind:path';

export type CatalogPortDef = {
  path: string;
  label: string;
  handleId: string;
  group: string;
};

const ACTION_KIND_TO_ROOT: Partial<Record<string, string>> = {
  scan: 'scan',
  domain_scan: 'domain',
  geo_job: 'geo',
  success: 'journey',
  journey: 'journey',
  research_brief: 'brief',
  competitors_suggest: 'competitors',
  persona_bootstrap: 'persona',
  suggest_queries: 'queries',
};

const ROOT_TO_ACTION_KIND: Record<string, string> = {
  scan: 'scan',
  domain: 'domain_scan',
  geo: 'geo_job',
  journey: 'success',
  brief: 'research_brief',
  competitors: 'competitors_suggest',
  persona: 'persona_bootstrap',
  queries: 'suggest_queries',
};

export function catalogOutHandleId(path: string): string {
  return `${CATALOG_OUT_HANDLE_PREFIX}${path}`;
}

export function catalogPathFromOutHandle(handle: string | null | undefined): string | null {
  if (!handle || !handle.startsWith(CATALOG_OUT_HANDLE_PREFIX)) return null;
  const path = handle.slice(CATALOG_OUT_HANDLE_PREFIX.length).trim();
  return path && isCatalogPath(path) ? path : null;
}

export function catalogRootFromPath(path: string): string | null {
  const root = path.trim().split('.')[0];
  return root || null;
}

export function actionKindForCatalogRoot(root: string): string | null {
  return ROOT_TO_ACTION_KIND[root] ?? null;
}

export function catalogRootForActionKind(kind: string): string | null {
  return ACTION_KIND_TO_ROOT[kind] ?? null;
}

/** Output ports for action nodes that write catalog bundles (Wave 10). */
export function catalogPortsForActionKind(kind: string): CatalogPortDef[] {
  const root = catalogRootForActionKind(kind);
  if (!root) return [];
  return CATALOG_PATH_OPTIONS.filter((o) => o.group === root).map((o) => ({
    path: o.path,
    label: o.label,
    handleId: catalogOutHandleId(o.path),
    group: o.group,
  }));
}

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

/**
 * Resolve a node param (URL, companyName, text, …) against run context.
 * Supports whole-field and mixed `{{ … }}` templates. Unresolved → null for URL-like
 * callers that need a usable absolute value; empty string when template yields empty.
 */
export function resolveFlowParamString(
  ctx: CollectionFlowRunContext,
  raw: string | null | undefined
): string | null {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return null;
  const resolved = resolveTemplateString(ctx, trimmed).trim();
  if (resolved) return resolved;
  // Unresolved expression / empty template result
  if (trimmed.includes('{{') || trimmed.includes('}}')) return null;
  if (trimmed.includes('.') || trimmed.includes('[')) {
    // Bare catalog path that did not resolve — do not treat as URL literal.
    return null;
  }
  return trimmed;
}

function looksLikeExpressionField(raw: string): boolean {
  return raw.includes('{{') || raw.includes('}}') || raw.includes('.') || raw.includes('[');
}

/**
 * Clone a node with all string ExpressionField params resolved against run context.
 * Does not mutate the saved document.
 */
export function resolveNodeStringParams(
  node: CollectionFlowNode,
  ctx: CollectionFlowRunContext
): CollectionFlowNode {
  const next: CollectionFlowNode = { ...node };

  if (typeof node.url === 'string') next.url = resolveTemplateString(ctx, node.url);
  if (typeof node.urlKey === 'string') next.urlKey = resolveTemplateString(ctx, node.urlKey);
  if (typeof node.text === 'string') next.text = resolveTemplateString(ctx, node.text);
  if (typeof node.note === 'string') next.note = resolveTemplateString(ctx, node.note);
  if (typeof node.pattern === 'string') next.pattern = resolveTemplateString(ctx, node.pattern);
  if (typeof node.companyName === 'string') {
    next.companyName = resolveTemplateString(ctx, node.companyName);
  }
  if (typeof node.path === 'string') next.path = resolveTemplateString(ctx, node.path);
  if (typeof node.value === 'string') next.value = resolveTemplateString(ctx, node.value);
  if (typeof node.alias === 'string' && looksLikeExpressionField(node.alias)) {
    next.alias = resolveTemplateString(ctx, node.alias);
  }
  if (typeof node.measureKey === 'string' && looksLikeExpressionField(node.measureKey)) {
    next.measureKey = resolveTemplateString(ctx, node.measureKey);
  }

  return next;
}

/** Resolve string params on every node (run-time snapshot). */
export function resolveDocumentStringParams(
  nodes: CollectionFlowNode[],
  ctx: CollectionFlowRunContext
): CollectionFlowNode[] {
  return nodes.map((n) => resolveNodeStringParams(n, ctx));
}

/** Authoring-time start config written into run context so `$('startId').json.url` works. */
export function buildStartConfigBundle(
  start: CollectionFlowNode,
  resolvedUrl: string | null
): Record<string, unknown> {
  const url = resolvedUrl ?? '';
  return {
    url,
    urlKey: url || (start.urlKey?.trim() ?? ''),
    maxSteps: typeof start.maxSteps === 'number' ? start.maxSteps : 8,
    personaId: start.personaId ?? null,
    personaName: start.personaName ?? null,
    segment: start.segment ?? null,
    label: start.label ?? '',
  };
}

/**
 * Seed start node config under `outputs[startId]` (+ `outputs.start`) before resolving
 * downstream URL expressions like `{{ $('n-start').json.url }}`.
 */
export function seedStartNodeIntoContext(
  ctx: CollectionFlowRunContext,
  nodes: CollectionFlowNode[]
): { ctx: CollectionFlowRunContext; startUrl: string | null; start: CollectionFlowNode | null } {
  const start = nodes.find((n) => n.kind === 'start') ?? null;
  if (!start) return { ctx, startUrl: null, start: null };

  const raw = (start.url ?? start.urlKey ?? '').trim();
  const startUrl = resolveFlowParamString(ctx, raw);
  const bundle = buildStartConfigBundle(start, startUrl);
  let next = setContextBundle(ctx, 'start', bundle, start.id);
  return { ctx: next, startUrl, start };
}

/**
 * Resolve scan / domain / geo / start URL chain for a flow run (Wave 18+ URL params).
 * Empty quality URL falls back to start (legacy behavior).
 */
export function resolveRunUrlChain(input: {
  ctx: CollectionFlowRunContext;
  urlOverride?: string | null;
  qualityUrlRaw?: string | null;
  geoUrlRaw?: string | null;
  startUrl?: string | null;
}): { baseUrl: string | null; qualityUrl: string | null; geoUrl: string | null } {
  const qualityUrl = resolveFlowParamString(input.ctx, input.qualityUrlRaw);
  const geoUrl = resolveFlowParamString(input.ctx, input.geoUrlRaw);
  const override =
    typeof input.urlOverride === 'string' && input.urlOverride.trim()
      ? input.urlOverride.trim()
      : null;
  const baseUrl = override ?? qualityUrl ?? geoUrl ?? input.startUrl ?? null;
  return { baseUrl, qualityUrl, geoUrl };
}

/**
 * Apply `set` nodes: resolve source expression → `outputs[alias]` (Wave 20).
 * Order: document node order among kind === 'set'.
 */
export function applySetNodes(
  nodes: CollectionFlowNode[],
  ctx: CollectionFlowRunContext
): CollectionFlowRunContext {
  let next = ctx;
  for (const n of nodes) {
    if (n.kind !== 'set') continue;
    const alias = (n.alias ?? n.label ?? '').trim();
    if (!alias) continue;
    const source = n.path?.trim() ?? '';
    if (!source) continue;
    const resolved = resolveExpression(next, source);
    const bundle: Record<string, unknown> =
      resolved != null && typeof resolved === 'object' && !Array.isArray(resolved)
        ? { ...(resolved as Record<string, unknown>) }
        : { value: resolved };
    next = setContextBundle(next, alias, bundle, n.id);
  }
  return next;
}

/** Resolve a path against run context outputs (open paths + array index, Wave 18). */
export function resolveCatalogPath(
  ctx: CollectionFlowRunContext,
  path: string
): CatalogScalar | undefined {
  return toCatalogScalar(resolveContextPath(ctx, path));
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
  const expectedRaw =
    op === 'exists' || op === 'not_exists'
      ? undefined
      : node.value !== undefined
        ? node.value
        : typeof node.threshold === 'number'
          ? node.threshold
          : DEFAULT_SCORE_GATE_THRESHOLD;
  const actual = resolveExpressionScalar(ctx, path);
  const expected =
    expectedRaw === undefined ? undefined : resolveExpressionScalar(ctx, expectedRaw);
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
  issueItems?: CatalogIssueItem[] | null;
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
  const items = (input.issueItems ?? []).map((it) => ({
    id: it.id ?? null,
    severity: it.severity ?? null,
    ruleId: it.ruleId ?? null,
    title: it.title ?? null,
  }));
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
      ruleIds: issues.ruleIds ?? items.map((i) => i.ruleId).filter(Boolean),
      items,
    },
  };
}

export type CatalogIssueItem = {
  id?: string;
  severity?: string;
  ruleId?: string;
  title?: string;
};

export function buildDomainCatalogBundle(input: {
  status: string;
  overallScore: number | null;
  pageCount?: number | null;
  issueCount?: number | null;
  issues?: IssueGateSignals | null;
  issueItems?: CatalogIssueItem[] | null;
  scanId?: string | null;
  url?: string | null;
}): Record<string, unknown> {
  const issues = input.issues ?? {
    criticalCount: 0,
    seriousCount: 0,
    issueCount: input.issueCount ?? 0,
  };
  const items = (input.issueItems ?? []).map((it) => ({
    id: it.id ?? null,
    severity: it.severity ?? null,
    ruleId: it.ruleId ?? null,
    title: it.title ?? null,
  }));
  return {
    status: input.status,
    overallScore: input.overallScore,
    pageCount: input.pageCount ?? null,
    scanId: input.scanId ?? null,
    url: input.url ?? null,
    issueCount: issues.issueCount,
    issues: {
      criticalCount: issues.criticalCount,
      seriousCount: issues.seriousCount,
      issueCount: issues.issueCount,
      ruleIds: issues.ruleIds ?? items.map((i) => i.ruleId).filter(Boolean),
      items,
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
  personaCount?: number;
  jobId?: string | null;
  studyId?: string | null;
  waveId?: string | null;
}): Record<string, unknown> {
  const personaCount =
    typeof input.personaCount === 'number' && Number.isFinite(input.personaCount)
      ? input.personaCount
      : 1;
  return {
    taskCompleted: input.taskCompleted,
    validEvidence: input.validEvidence,
    finalUrl: input.finalUrl,
    personaCount,
    allTaskCompleted: input.taskCompleted,
    jobId: input.jobId ?? null,
    studyId: input.studyId ?? null,
    waveId: input.waveId ?? null,
  };
}

/** Wave 23 — company brief catalog. */
export function buildBriefCatalogBundle(
  brief: Record<string, unknown>
): Record<string, unknown> {
  return {
    displayName: typeof brief.displayName === 'string' ? brief.displayName : null,
    industry: typeof brief.industry === 'string' ? brief.industry : null,
    summary: typeof brief.summary === 'string' ? brief.summary : null,
    targetAudienceHint:
      typeof brief.targetAudienceHint === 'string' ? brief.targetAudienceHint : null,
    companyContext: typeof brief.companyContext === 'string' ? brief.companyContext : null,
    disambiguationNote:
      typeof brief.disambiguationNote === 'string' ? brief.disambiguationNote : null,
    generatedAt: typeof brief.generatedAt === 'string' ? brief.generatedAt : null,
  };
}

export function buildCompetitorsCatalogBundle(items: string[]): Record<string, unknown> {
  return { items: items.map((s) => String(s).trim()).filter(Boolean) };
}

export function buildPersonaCatalogBundle(input: {
  id?: string | null;
  name?: string | null;
  segment?: string | null;
  count?: number;
}): Record<string, unknown> {
  return {
    id: input.id ?? null,
    name: input.name ?? null,
    segment: input.segment ?? null,
    count: input.count ?? 1,
  };
}

export function buildQueriesCatalogBundle(items: string[]): Record<string, unknown> {
  const cleaned = items.map((s) => String(s).trim()).filter(Boolean);
  return { items: cleaned, text: cleaned.join('\n') };
}

export function flattenContextForInspector(
  ctx: CollectionFlowRunContext | null | undefined,
  root: string
): Array<{ key: string; value: string }> {
  if (!ctx?.outputs[root]) return [];
  const rows: Array<{ key: string; value: string }> = [];
  const walk = (prefix: string, val: unknown) => {
    if (Array.isArray(val)) {
      if (val.length === 0) {
        rows.push({ key: prefix, value: '[]' });
        return;
      }
      val.forEach((item, idx) => walk(`${prefix}[${idx}]`, item));
      return;
    }
    if (val == null || typeof val !== 'object') {
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

/** Flatten all roots (+ node aliases) for Context Tree (Wave 19). */
export function flattenAllContextOutputs(
  ctx: CollectionFlowRunContext | null | undefined
): Array<{ path: string; value: string }> {
  if (!ctx?.outputs) return [];
  const rows: Array<{ path: string; value: string }> = [];
  for (const root of Object.keys(ctx.outputs)) {
    for (const row of flattenContextForInspector(ctx, root)) {
      rows.push({ path: `${root}.${row.key}`.replace(/\.\[/g, '['), value: row.value });
    }
  }
  return rows;
}
