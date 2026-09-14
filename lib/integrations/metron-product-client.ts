/**
 * Thin Plexon → METRON product HTTP helper (service secret + actor + contract).
 * @see specs/domain/capability-catalog.md — METRON set
 */

import { getMetronServiceApiUrl } from '@/lib/constants';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';

const PLEXON_USER_HEADER = 'X-Plexon-User-Id';

export type MetronProductResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: string; data?: unknown };

function requireAuth():
  | { ok: true; base: string; headers: Record<string, string> }
  | { ok: false; error: string; status: number } {
  const base = getMetronServiceApiUrl()?.replace(/\/+$/, '') ?? '';
  const secret = process.env.PLEXON_SERVICE_SECRET?.trim() ?? '';
  if (!base) return { ok: false, error: 'METRON URL missing on PLEXON', status: 503 };
  if (!secret) return { ok: false, error: 'PLEXON_SERVICE_SECRET missing on PLEXON', status: 503 };
  return {
    ok: true,
    base,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [PLEXON_SERVICE_SECRET_HEADER]: secret,
      [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
    },
  };
}

function withActor(
  headers: Record<string, string>,
  actorUserId?: string | null,
): Record<string, string> {
  const next = { ...headers };
  if (actorUserId?.trim()) next[PLEXON_USER_HEADER] = actorUserId.trim();
  return next;
}

export async function metronProductFetch(input: {
  path: string;
  method?: string;
  body?: unknown;
  actorUserId?: string | null;
}): Promise<MetronProductResult> {
  const auth = requireAuth();
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error };
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
  try {
    const res = await fetch(`${auth.base}${path}`, {
      method: input.method ?? 'GET',
      headers: withActor(auth.headers, input.actorUserId),
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
    });
    const text = await res.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text.slice(0, 400) };
    }
    if (!res.ok) {
      const err = data as { error?: string; message?: string };
      return {
        ok: false,
        status: res.status,
        error: err.error ?? err.message ?? `HTTP ${res.status}`,
        data,
      };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
