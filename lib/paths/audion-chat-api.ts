/**
 * Plexon BFF routes for Audion persona chat (Wave C6).
 * Browser calls same-origin paths; server proxies to Audion platform `/api`.
 * @see knowledge/eqc-persona-chat.md
 */

const CAP = '/api/capabilities/audion';

export const API_AUDION_CHAT_STREAM = `${CAP}/chat/stream`;

export const API_AUDION_CHAT_TAVUS_SESSION = `${CAP}/chat/tavus/session`;

export function apiAudionSharePersona(personaId: string, projectId: string): string {
  const params = new URLSearchParams({ projectId });
  return `${CAP}/share/personas/${encodeURIComponent(personaId)}?${params}`;
}

export function apiAudionChatToolDecision(callId: string): string {
  return `${CAP}/chat/tool-call/decision/${encodeURIComponent(callId)}`;
}

/** Audion platform paths (server-side proxy targets). */
export const audionPlatformChatStream = () => '/chat/stream';

export const audionPlatformChatTavusSession = () => '/chat/tavus/session';

export function audionPlatformSharePersona(personaId: string, projectId: string): string {
  const params = new URLSearchParams({ projectId });
  return `/share/personas/${encodeURIComponent(personaId)}?${params}`;
}

export function audionPlatformChatToolDecision(callId: string): string {
  return `/chat/tool-call/decision/${encodeURIComponent(callId)}`;
}
