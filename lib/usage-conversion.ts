/**
 * PLEXON – Convert raw_units to token count per event_type.
 * Central place for conversion rules; can later be moved to DB (usage_conversion_rules).
 */

const DEFAULT_UNKNOWN_TOKENS = 10;

type RawUnits = Record<string, unknown>;

export function tokensFromEvent(eventType: string, rawUnits: RawUnits): number {
  const r = rawUnits ?? {};
  const n = (x: unknown) => (typeof x === 'number' && !Number.isNaN(x) ? x : Number(x));
  const num = (x: unknown, fallback: number) => {
    const v = n(x);
    return Number.isNaN(v) ? fallback : v;
  };
  switch (eventType) {
    case 'llm_request':
    case 'chat':
      return num(r.input_tokens, 0) + 2 * num(r.output_tokens, 0);
    case 'scan_wcag':
      return 50 * (num(r.scans, 1) || 1);
    case 'scan_screenshot':
      return 5 * (num(r.pages, 1) || 1);
    case 'scan_pagespeed':
      return 20;
    case 'domain_scan':
      return 50 * (num(r.pages, 1) || 1);
    /** CHECKION: one Deep-Scan page finished (WCAG desktop run); same rate as domain_scan per page. */
    case 'domain_scan_page': {
      if (r.reused_unchanged === true) {
        return 5 * (num(r.pages, 1) || 1);
      }
      return 50 * (num(r.pages, 1) || 1);
    }
    case 'summarize':
    case 'saliency_ai':
    case 'journey_agent':
    case 'geo_eeat': {
      const hasTokenNumbers =
        typeof r.input_tokens === 'number' || typeof r.output_tokens === 'number';
      if (hasTokenNumbers) {
        const llm = num(r.input_tokens, 0) + 2 * num(r.output_tokens, 0);
        return Math.max(100, llm);
      }
      return 100;
    }
    case 'page_classify': {
      const hasTokenNumbers =
        typeof r.input_tokens === 'number' || typeof r.output_tokens === 'number';
      if (hasTokenNumbers) {
        const llm = num(r.input_tokens, 0) + 2 * num(r.output_tokens, 0);
        return Math.max(40 * (num(r.pages, 1) || 1), llm);
      }
      return 40 * (num(r.pages, 1) || 1);
    }
    case 'ux_check': {
      const hasTokenNumbers =
        typeof r.input_tokens === 'number' || typeof r.output_tokens === 'number';
      if (hasTokenNumbers) {
        const llm = num(r.input_tokens, 0) + 2 * num(r.output_tokens, 0);
        return Math.max(120, llm);
      }
      return 120 * (num(r.runs, 1) || 1);
    }
    case 'serp_refresh':
      return 35 * (num(r.keywords, 1) || 1);
    case 'tool_extract':
      return 28 * (num(r.requests, 1) || 1);
    case 'wayback_lookup':
      return 6 * (num(r.requests, 1) || 1);
    case 'ssl_labs_analyze':
      return 18 * (num(r.requests, 1) || 1);
    case 'competitive_benchmark':
      return 15 * (num(r.queries, 1) || 1);
    case 'persona_generate':
    case 'journey_generate':
      return 150 * (num(r.runs, 1) || 1);
    case 'journey_validate':
      return 35 * (num(r.personas, 1) || 1);
    case 'chat_message':
      return 80 * (num(r.runs, 1) || 1);
    case 'persona_discover':
      return 75 * (num(r.runs, 1) || 1);
    case 'retrieval_query':
      return 18 * (num(r.queries, 1) || 1);
    default:
      return DEFAULT_UNKNOWN_TOKENS;
  }
}

export function getCurrentPeriod(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
