import { echonIntegrationUrl, getEchonServiceToken } from '@/lib/paths/echon-api';

export type EchonServiceFetchResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number | null; reason: string; detail?: string };

export function mapEchonHttpFailure(status: number | null, detail?: string): string {
  if (status === 401) return 'echon_http_401';
  if (status === 403) return 'echon_http_403';
  if (status === 404) return 'echon_thread_not_found';
  if (status === 502) return 'echon_http_502';
  if (status === 503) return 'echon_http_503';
  if (status === 500) return 'echon_http_500';
  if (detail?.toLowerCase().includes('abort')) return 'echon_fetch_timeout';
  return 'echon_fetch_failed';
}

export async function echonServiceFetchJson<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 25_000,
  absoluteUrl?: string
): Promise<EchonServiceFetchResult<T>> {
  const url = absoluteUrl ?? echonIntegrationUrl(path);
  const token = getEchonServiceToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? ((await res.json()) as Record<string, unknown>) : null;
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : typeof body?.message === 'string'
          ? body.message
          : undefined;

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        reason: mapEchonHttpFailure(res.status, detail),
        detail,
      };
    }

    return { ok: true, status: res.status, data: body as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      status: null,
      reason: mapEchonHttpFailure(null, msg),
      detail: msg,
    };
  } finally {
    clearTimeout(timer);
  }
}
