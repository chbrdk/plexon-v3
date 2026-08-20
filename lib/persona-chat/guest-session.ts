/**
 * Guest chat session for native EQC persona chat (Plexon host).
 * Audion enforces budgets server-side; Plexon stores session id locally.
 */
export const PLEXON_GUEST_CHAT_COOKIE = 'audion_guest_chat';

export const GUEST_CHAT_MAX_USER_TURNS = 5;
export const GUEST_CHAT_MAX_CHARS = 800;
export const GUEST_CHAT_TTL_SEC = 30 * 60;

export function createGuestSessionId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const storageKey = (personaId: string, projectId: string) =>
  `plexon-guest-chat:${personaId}:${projectId}`;

export function readStoredGuestSessionId(personaId: string, projectId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(storageKey(personaId, projectId))?.trim() || null;
  } catch {
    return null;
  }
}

export function storeGuestSessionId(personaId: string, projectId: string, sessionId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(personaId, projectId), sessionId.trim());
  } catch {
    /* ignore quota */
  }
}

/** Server BFF — cookie + body only. */
export function resolveGuestSessionId(fromCookie?: string | null, fromBody?: string | null): string {
  const body = fromBody?.trim();
  if (body) return body;
  const cookie = fromCookie?.trim();
  if (cookie) return cookie;
  return createGuestSessionId();
}

/** Browser — sessionStorage fallback before first cookie round-trip. */
export function resolveClientGuestSessionId(
  personaId: string,
  projectId: string,
  fromBody?: string | null,
): string {
  const body = fromBody?.trim();
  if (body) return body;
  const stored = readStoredGuestSessionId(personaId, projectId);
  if (stored) return stored;
  return createGuestSessionId();
}
