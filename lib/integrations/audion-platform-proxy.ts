/**
 * Server-side proxy to Audion Next.js platform `/api` routes.
 * Uses service token + session actor for gated routes; public chat may skip auth.
 */
import { getAudionPlatformApiBase, getAudionServiceToken } from '@/lib/constants';
import {
  AUDION_MACHINE_ACTOR_REQUIRED,
  buildAudionMachineHeaders,
} from '@/lib/integrations/audion-connectivity';

export type AudionPlatformProxyOptions = {
  /** When true (default), attach Bearer service token when configured. */
  serviceAuth?: boolean;
  /** Session actor — required when serviceAuth is on and the route uses Access Model B. */
  actorUserId?: string | null;
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
    const actor = options.actorUserId?.trim() || '';
    if (actor) {
      const machine = buildAudionMachineHeaders(actor);
      if (!machine) {
        return new Response(JSON.stringify({ error: 'AUDION_API_TOKEN not configured' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      for (const [k, v] of Object.entries(machine)) {
        headers.set(k, v);
      }
    } else {
      // Guest / public chat paths: token only when no actor (routes that skip Model B).
      const token = getAudionServiceToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
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

/** Fail closed helper for gated BFF proxies that always need an actor. */
export function requireAudionPlatformActor(actorUserId: string | null | undefined): string | null {
  const actor = actorUserId?.trim() || '';
  return actor || null;
}

export { AUDION_MACHINE_ACTOR_REQUIRED };

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
