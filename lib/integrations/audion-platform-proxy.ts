/**
 * Server-side proxy to Audion Next.js platform `/api` routes.
 * Uses service token for gated routes; public chat routes skip auth.
 */
import { getAudionPlatformApiBase, getAudionServiceToken } from '@/lib/constants';

export type AudionPlatformProxyOptions = {
  /** When true (default), attach Bearer service token when configured. */
  serviceAuth?: boolean;
  /** Forward incoming Cookie header (guest session). */
  forwardCookies?: string | null;
};

export function audionPlatformUrl(path: string): string {
  const base = getAudionPlatformApiBase().replace(/\/+$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function fetchAudionPlatform(
  path: string,
  init: RequestInit = {},
  options: AudionPlatformProxyOptions = {},
): Promise<Response> {
  const useServiceAuth = options.serviceAuth !== false;
  const headers = new Headers(init.headers);
  if (useServiceAuth) {
    const token = getAudionServiceToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.forwardCookies) {
    headers.set('Cookie', options.forwardCookies);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(audionPlatformUrl(path), {
    ...init,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  });
}

export function readRequestCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=').trim());
  }
  return null;
}

export function extractSetCookieValue(setCookieHeader: string | null, cookieName: string): string | null {
  if (!setCookieHeader) return null;
  for (const chunk of setCookieHeader.split(/,(?=\s*[^;]+=)/)) {
    const [pair] = chunk.split(';');
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    if (name === cookieName) return decodeURIComponent(pair.slice(eq + 1).trim());
  }
  return null;
}
