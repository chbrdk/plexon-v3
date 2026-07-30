/**
 * ECHON integration URLs (server-side).
 * @see knowledge/echon-mcp-integration.md
 * @see msqdx-echon/v2/knowledge/echon-urls-and-paths.md
 */

import { EVENT_QUICK_CHECK_ECHON_RESEARCH_MAX_MS } from '@/lib/paths/assistant-workflows';

/** Public nginx prefix (external). */
export const ECHON_API_PUBLIC_BASE = 'https://echon.projects-a.plygrnd.tech/echon' as const;

export const ECHON_DASHBOARD_URL = 'https://echon.projects-a.plygrnd.tech/echon/dashboard' as const;

export const ECHON_RESEARCH_FAST_TIMEOUT_MS = 180_000;

/** Playbook: max wait for ECHON research (fast depth). */
export const ECHON_PLAYBOOK_RESEARCH_TIMEOUT_MS = 600_000;

export const ECHON_RESEARCH_RUN_TIMEOUT_MS = 1_800_000;

export const ECHON_RESEARCH_POLL_INTERVAL_MS = 10_000;

export const ECHON_RESEARCH_POLL_REQUEST_TIMEOUT_MS = 45_000;

export const ECHON_RESEARCH_START_REQUEST_TIMEOUT_MS = 60_000;

export type EchonReportResearchDepth = 'fast' | 'balanced' | 'deep';

export const ECHON_PLAYBOOK_RESEARCH_DEPTH: EchonReportResearchDepth = 'fast';

export function getEchonPlaybookResearchTimeoutMs(): number {
  return ECHON_PLAYBOOK_RESEARCH_TIMEOUT_MS;
}

export function getEchonResearchPollIntervalMs(): number {
  return ECHON_RESEARCH_POLL_INTERVAL_MS;
}

export function getEchonResearchPollRequestTimeoutMs(): number {
  return ECHON_RESEARCH_POLL_REQUEST_TIMEOUT_MS;
}

export function getEchonResearchStartRequestTimeoutMs(): number {
  return ECHON_RESEARCH_START_REQUEST_TIMEOUT_MS;
}

export function getEventQuickCheckEchonResearchMaxMs(): number {
  return EVENT_QUICK_CHECK_ECHON_RESEARCH_MAX_MS;
}

export function echonDashboardResearchUrl(threadId?: string): string {
  const base = ECHON_DASHBOARD_URL.replace(/\/$/, '');
  if (threadId?.trim()) {
    return `${base}?thread=${encodeURIComponent(threadId.trim())}`;
  }
  return base;
}

export function getEchonApiBaseUrl(): string {
  const fromEnv = process.env.ECHON_API_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return ECHON_API_PUBLIC_BASE.replace(/\/$/, '');
}

/** Ordered API bases for Quick Check: env first, then public nginx (when Docker DNS fails). */
export function getEchonQuickCheckApiBaseCandidates(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (url: string | null | undefined) => {
    const normalized = url?.trim().replace(/\/$/, '');
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  };
  add(getEchonServerApiBaseUrl());
  add(ECHON_API_PUBLIC_BASE.replace(/\/$/, ''));
  return out;
}

export function isEchonDnsOrNetworkError(detail?: string): boolean {
  if (!detail?.trim()) return false;
  return /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|getaddrinfo|fetch failed/i.test(detail);
}

/** Explicit server-side FastAPI base — no public fallback (PLEXON → ECHON in Coolify). */
export function getEchonServerApiBaseUrl(): string | null {
  const fromEnv = process.env.ECHON_API_URL?.trim().replace(/\/$/, '');
  return fromEnv || null;
}

export function isEchonServerIntegrationConfigured(): boolean {
  return Boolean(getEchonServerApiBaseUrl());
}

export function echonServerIntegrationUrl(path: string): string {
  const base = getEchonServerApiBaseUrl();
  if (!base) {
    throw new Error('ECHON_API_URL is not configured');
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function getEchonServiceToken(): string | null {
  const token = (process.env.ECHON_SERVICE_TOKEN ?? '').trim();
  return token || null;
}

export function echonResearchRunsPath(): string {
  return '/api/v2/research/runs';
}

export function echonResearchRunStatusPath(runId: string): string {
  return `/api/v2/research/runs/${encodeURIComponent(runId)}`;
}

export function echonResearchThreadPath(threadId: string): string {
  return `/api/v2/research/threads/${encodeURIComponent(threadId)}`;
}

export function echonResearchChatPath(): string {
  return '/api/v2/research/chat';
}

export function echonSignalsPath(): string {
  return '/api/v2/signals';
}

export function echonWavesPath(): string {
  return '/api/v2/waves';
}

export function echonHealthPath(): string {
  return '/health';
}

export function echonIntegrationUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getEchonApiBaseUrl()}${normalized}`;
}
