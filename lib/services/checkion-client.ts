/* ------------------------------------------------------------------ */
/*  PLEXON – CHECKION API client (server-side, for user management)    */
/* ------------------------------------------------------------------ */

import { getCheckionServiceApiUrl } from '@/lib/constants';

const BASE = getCheckionServiceApiUrl();
const ADMIN_KEY = process.env.CHECKION_ADMIN_API_KEY ?? '';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(ADMIN_KEY ? { Authorization: `Bearer ${ADMIN_KEY}` } : {}),
  };
}

export function isCheckionConfigured(): boolean {
  return Boolean(BASE && ADMIN_KEY);
}

export async function checkionFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  if (!BASE) {
    return { ok: false, status: 503, error: 'CHECKION_API_URL not configured' };
  }
  if (!ADMIN_KEY) {
    return { ok: false, status: 503, error: 'CHECKION_ADMIN_API_KEY not configured' };
  }
  const url = path.startsWith('http') ? path : `${BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...headers(), ...(options.headers as Record<string, string>) },
    });
    const text = await res.text();
    let data: T | undefined;
    try {
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      // non-JSON response
    }
    if (!res.ok) {
      const errMsg = (data as { error?: string })?.error ?? res.statusText;
      return { ok: false, status: res.status, error: errMsg, data };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return { ok: false, status: 502, error: message };
  }
}
