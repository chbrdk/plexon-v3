import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';

export type CheckionToolGetResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function fetchCheckionToolGet<T>(
  url: string,
  label: string
): Promise<CheckionToolGetResult<T>> {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: auth.headers.Authorization },
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `${label}: HTTP ${res.status} – ${body.slice(0, 120)}` };
    }
    const json = JSON.parse(body) as { success?: boolean; data?: T; message?: string };
    if (!json.data) {
      const hint = json.message ? ` – ${json.message}` : '';
      return { ok: false, error: `${label} ohne Daten${hint}` };
    }
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function normalizeCheckionHost(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).hostname;
    }
  } catch {
    // fall through
  }
  return trimmed.replace(/^https?:\/\//, '').split('/')[0] ?? trimmed;
}
