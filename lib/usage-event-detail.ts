/**
 * Short human-readable line for usage history (dashboard).
 * Keeps PLEXON UI understandable without exposing huge JSON.
 */

type Raw = Record<string, unknown> | null | undefined;

function trunc(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Returns a single-line detail for the usage table, or empty string.
 */
export function formatUsageEventDetail(eventType: string, rawUnits: Raw): string {
  if (!rawUnits || typeof rawUnits !== 'object') return '';

  if (eventType === 'domain_scan_page') {
    const scanId = typeof rawUnits.domain_scan_id === 'string' ? rawUnits.domain_scan_id : '';
    const idx = rawUnits.page_index;
    const ok = rawUnits.ok === true;
    const url = typeof rawUnits.url === 'string' ? rawUnits.url : '';
    const reused = rawUnits.reused_unchanged === true;
    const idShort = scanId ? trunc(scanId, 12) : '—';
    const idxStr = typeof idx === 'number' && !Number.isNaN(idx) ? String(idx) : '?';
    const status = ok ? 'ok' : 'fail';
    const urlPart = url ? ` · ${trunc(url, 42)}` : '';
    const reusePart = reused ? ' · reused' : '';
    return `Deep scan ${idShort} · page #${idxStr} · ${status}${reusePart}${urlPart}`;
  }

  if (eventType === 'domain_scan') {
    const p = rawUnits.pages;
    if (typeof p === 'number' && !Number.isNaN(p)) return `pages: ${p}`;
    return '';
  }

  if (eventType === 'retrieval_query') {
    const q = rawUnits.queries;
    return typeof q === 'number' ? `queries: ${q}` : '';
  }

  if (eventType === 'llm_request' || eventType === 'chat') {
    const inp = rawUnits.input_tokens ?? rawUnits.prompt_tokens;
    const out = rawUnits.output_tokens ?? rawUnits.completion_tokens;
    const model = typeof rawUnits.model === 'string' ? rawUnits.model.trim() : '';
    const modelPart = model ? ` · ${trunc(model, 24)}` : '';
    if (typeof inp === 'number' || typeof out === 'number') {
      return `in ${inp ?? '—'} · out ${out ?? '—'}${modelPart}`;
    }
  }

  return '';
}
