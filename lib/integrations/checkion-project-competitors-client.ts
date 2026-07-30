import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import {
  checkionApiProjectPath,
  checkionApiProjectSuggestCompetitors,
} from '@/lib/paths/checkion-api';

function formatCheckionHttpFailure(status: number, body: string, context: string): string {
  const snippet = body.trim().slice(0, 120).replace(/\s+/g, ' ');
  return snippet ? `${context}: HTTP ${status} – ${snippet}` : `${context}: HTTP ${status}`;
}

function requireAuth():
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: string } {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return auth;
  return { ok: true, headers: auth.headers };
}

/** Normalize competitor entries to hostnames (CHECKION project.competitors format). */
export function normalizeCheckionCompetitorDomains(domains: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of domains) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    let host = trimmed;
    try {
      host = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`).hostname;
    } catch {
      host = trimmed.replace(/^https?:\/\//i, '').split('/')[0] ?? trimmed;
    }
    host = host.toLowerCase().replace(/^www\./, '');
    if (!host || seen.has(host)) continue;
    seen.add(host);
    out.push(host);
  }
  return out;
}

export type SuggestCheckionProjectCompetitorsResult =
  | { ok: true; competitors: string[]; queries: string[] }
  | { ok: false; error: string };

/** CHECKION POST /api/projects/{id}/suggest-competitors — same LLM as project UI. */
export async function suggestCheckionProjectCompetitors(input: {
  projectId: string;
  url?: string;
}): Promise<SuggestCheckionProjectCompetitorsResult> {
  const auth = requireAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  const projectId = input.projectId.trim();
  if (!projectId) return { ok: false, error: 'CHECKION projectId fehlt' };

  try {
    const res = await fetch(checkionApiProjectSuggestCompetitors(projectId), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify(input.url?.trim() ? { url: input.url.trim() } : {}),
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: formatCheckionHttpFailure(res.status, body, 'CHECKION Wettbewerber-Vorschlag'),
      };
    }
    const json = JSON.parse(body) as { competitors?: string[]; queries?: string[] };
    return {
      ok: true,
      competitors: normalizeCheckionCompetitorDomains(
        Array.isArray(json.competitors) ? json.competitors.map(String) : []
      ),
      queries: Array.isArray(json.queries) ? json.queries.map(String) : [],
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type UpdateCheckionProjectResult =
  | { ok: true; competitors?: string[]; domain?: string | null }
  | { ok: false; error: string };

/** CHECKION PATCH /api/projects/{id} — persist competitors on the project (required before domain-scan-all). */
export async function updateCheckionProject(input: {
  projectId: string;
  competitors?: string[];
  domain?: string;
}): Promise<UpdateCheckionProjectResult> {
  const auth = requireAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  const projectId = input.projectId.trim();
  if (!projectId) return { ok: false, error: 'CHECKION projectId fehlt' };

  const patch: Record<string, unknown> = {};
  if (input.competitors != null) {
    patch.competitors = normalizeCheckionCompetitorDomains(input.competitors);
  }
  if (input.domain?.trim()) {
    patch.domain = input.domain.trim();
  }
  if (!Object.keys(patch).length) {
    return { ok: false, error: 'Keine Projekt-Felder zum Aktualisieren' };
  }

  try {
    const res = await fetch(checkionApiProjectPath(projectId), {
      method: 'PATCH',
      headers: auth.headers,
      body: JSON.stringify(patch),
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: formatCheckionHttpFailure(res.status, body, 'CHECKION Projekt aktualisieren'),
      };
    }
    const json = JSON.parse(body) as {
      success?: boolean;
      data?: { competitors?: string[]; domain?: string | null };
    };
    const data = json.data ?? {};
    return {
      ok: true,
      competitors: Array.isArray(data.competitors) ? data.competitors.map(String) : patch.competitors as string[] | undefined,
      domain: data.domain ?? (typeof patch.domain === 'string' ? patch.domain : null),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
