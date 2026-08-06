/**
 * Safe Collection Flow path expressions (Wave 18) — n8n-inspired, no eval.
 * @see specs/domain/collection-test-flow.md — Wave 18
 */

export type ExpressionScalar = string | number | boolean | null;

export type ExpressionRunContext = {
  outputs: Record<string, Record<string, unknown>>;
};

export type ExpressionScope = {
  /** Current item JSON (`$json`). */
  json?: Record<string, unknown> | null;
};

const EXPR_WRAP = /^\{\{\s*([\s\S]*?)\s*\}\}$/;
const EXPR_EMBEDDED = /\{\{\s*([\s\S]*?)\s*\}\}/g;
const NODE_JSON = /^\$\(\s*['"]([^'"]+)['"]\s*\)\.json(?:\.(.+))?$/i;
const DOLLAR_JSON = /^\$json(?:\.(.+))?$/i;

/** Parse `a.b[0].c` / `a["b"]` into path segments. */
export function parsePathSegments(path: string): string[] {
  const segments: string[] = [];
  const src = path.trim();
  if (!src) return segments;
  let i = 0;
  while (i < src.length) {
    if (src[i] === '.') {
      i += 1;
      continue;
    }
    if (src[i] === '[') {
      i += 1;
      let buf = '';
      while (i < src.length && src[i] !== ']') {
        buf += src[i];
        i += 1;
      }
      if (src[i] === ']') i += 1;
      const unquoted = buf.trim().replace(/^['"]|['"]$/g, '');
      if (unquoted) segments.push(unquoted);
      continue;
    }
    let buf = '';
    while (i < src.length && src[i] !== '.' && src[i] !== '[') {
      buf += src[i];
      i += 1;
    }
    if (buf) segments.push(buf);
  }
  return segments;
}

export function getByPathSegments(root: unknown, segments: string[]): unknown {
  let cur: unknown = root;
  for (const seg of segments) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
      continue;
    }
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** Walk under `ctx.outputs` starting at first segment as root key. */
export function resolveContextPath(ctx: ExpressionRunContext, path: string): unknown {
  const segments = parsePathSegments(path);
  if (segments.length === 0) return undefined;
  const [root, ...rest] = segments;
  const bundle = ctx.outputs[root!];
  if (bundle == null) return undefined;
  if (rest.length === 0) return bundle;
  return getByPathSegments(bundle, rest);
}

export function toCatalogScalar(raw: unknown): ExpressionScalar | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw;
  return undefined;
}

export function unwrapExpressionBody(input: string): { kind: 'literal' | 'expr'; body: string } {
  const trimmed = input.trim();
  const m = trimmed.match(EXPR_WRAP);
  if (m) return { kind: 'expr', body: (m[1] ?? '').trim() };
  return { kind: 'literal', body: trimmed };
}

/** True when string looks like a broken or open `{{` expression (whole-field or mixed). */
export function expressionSyntaxIssue(input: string): string | null {
  const t = input.trim();
  if (!t.includes('{')) return null;
  const open = (t.match(/\{\{/g) || []).length;
  const close = (t.match(/\}\}/g) || []).length;
  if (open !== close) return 'Ungleichmäßige {{ }} Klammern';
  if (open === 0) return null;

  let matched = 0;
  const re = new RegExp(EXPR_EMBEDDED.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) != null) {
    matched += 1;
    if (!(m[1] ?? '').trim()) return 'Leere Expression';
  }
  if (matched !== open) return 'Ungleichmäßige {{ }} Klammern';
  return null;
}

function scalarToTemplateText(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return '';
}

/**
 * Resolve a field that may mix literals and `{{ … }}` chips (ExpressionField).
 * Whole-field expressions use `resolveExpression`; embedded chips are substituted in place.
 * Unresolved expressions become empty string (never forward the placeholder).
 */
export function resolveTemplateString(
  ctx: ExpressionRunContext,
  input: string | null | undefined,
  scope?: ExpressionScope
): string {
  if (input == null) return '';
  const raw = String(input);
  if (!raw.includes('{{')) {
    // Bare catalog path → resolve; plain literal stays.
    const resolved = resolveExpression(ctx, raw, scope);
    if (typeof resolved === 'string') return resolved;
    if (typeof resolved === 'number' || typeof resolved === 'boolean') return String(resolved);
    if (resolved === null) return '';
    if (resolved !== undefined && (raw.includes('.') || raw.includes('['))) return '';
    return raw;
  }

  const trimmed = raw.trim();
  if (EXPR_WRAP.test(trimmed)) {
    return scalarToTemplateText(resolveExpression(ctx, trimmed, scope));
  }

  return raw.replace(EXPR_EMBEDDED, (_full, body: string) =>
    scalarToTemplateText(resolveInner(ctx, String(body).trim(), scope))
  );
}

function resolveInner(ctx: ExpressionRunContext, body: string, scope?: ExpressionScope): unknown {
  const inner = body.trim();
  if (!inner) return undefined;

  const nodeMatch = inner.match(NODE_JSON);
  if (nodeMatch) {
    const nodeId = nodeMatch[1]!;
    const rest = (nodeMatch[2] ?? '').trim();
    const bundle = ctx.outputs[nodeId];
    if (bundle == null) return undefined;
    if (!rest) return bundle;
    return getByPathSegments(bundle, parsePathSegments(rest));
  }

  const jsonMatch = inner.match(DOLLAR_JSON);
  if (jsonMatch) {
    const rest = (jsonMatch[1] ?? '').trim();
    const json = scope?.json ?? null;
    if (json == null) return undefined;
    if (!rest) return json;
    return getByPathSegments(json, parsePathSegments(rest));
  }

  return resolveContextPath(ctx, inner);
}

/**
 * Resolve a parameter value against run context.
 * - Bare path / literal string without `{{` → context path (if dotted) else literal string
 * - `{{ … }}` → expression body
 * Numbers/booleans passed through as-is when already typed.
 */
export function resolveExpression(
  ctx: ExpressionRunContext,
  input: string | number | boolean | null | undefined,
  scope?: ExpressionScope
): unknown {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input === 'number' || typeof input === 'boolean') return input;

  const raw = String(input);
  const { kind, body } = unwrapExpressionBody(raw);
  if (kind === 'expr') return resolveInner(ctx, body, scope);

  // Bare catalog-style path (contains `.` or `[`) → resolve; else treat as literal string.
  if (body.includes('.') || body.includes('[')) {
    // Bare `$('node').json…` without {{ }} (inspector path field paste).
    if (body.startsWith("$('") || body.startsWith('$("')) {
      return resolveInner(ctx, body, scope);
    }
    const fromCtx = resolveContextPath(ctx, body);
    if (fromCtx !== undefined) return fromCtx;
  }
  return body;
}

export function resolveExpressionScalar(
  ctx: ExpressionRunContext,
  input: string | number | boolean | null | undefined,
  scope?: ExpressionScope
): ExpressionScalar | undefined {
  return toCatalogScalar(resolveExpression(ctx, input, scope));
}

/** Wrap a context path as insertable expression text. */
export function formatExpressionForPath(path: string): string {
  const p = path.trim();
  if (!p) return '';
  if (p.startsWith("$('") || p.startsWith('$json')) return `{{ ${p} }}`;
  return `{{ ${p} }}`;
}

export function formatNodeJsonExpression(nodeId: string, relativePath = ''): string {
  const id = nodeId.trim();
  if (!id) return '';
  const rel = relativePath.trim().replace(/^\./, '');
  return rel ? `{{ $('${id}').json.${rel} }}` : `{{ $('${id}').json }}`;
}
