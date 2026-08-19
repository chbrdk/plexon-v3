/**
 * EQC magazine → Audion persona chat (Wave C5 overlay + deep-link fallback).
 * @see knowledge/eqc-persona-chat.md
 * @see audion-v3/specs/domain/chat-embed.md
 */

import { buildAudionAppUrl, buildAudionChatUrl } from '@/lib/audion-admin-launch-url';
import { getAudionWebOrigin } from '@/lib/constants';

export function resolveEqcPersonaChatHref(input: {
  personaId?: string | null;
  audionProjectId?: string | null;
  webOrigin?: string;
}): string | null {
  const personaId = input.personaId?.trim() ?? '';
  const projectId = input.audionProjectId?.trim() ?? '';
  if (!personaId || !projectId) return null;
  return buildAudionChatUrl(input.webOrigin ?? getAudionWebOrigin(), {
    personaId,
    projectId,
  });
}

/** Chrome-stripped Audion embed for ChatOverlay iframe. */
export function resolveEqcPersonaChatEmbedHref(input: {
  personaId?: string | null;
  audionProjectId?: string | null;
  webOrigin?: string;
  theme?: string | null;
  /** Full persona chat (Tavus, inspect) — logged-in EQC overlay; public share stays guest. */
  full?: boolean;
}): string | null {
  const personaId = input.personaId?.trim() ?? '';
  const projectId = input.audionProjectId?.trim() ?? '';
  if (!personaId || !projectId) return null;
  return buildAudionAppUrl(input.webOrigin ?? getAudionWebOrigin(), '/chat/embed', {
    personaId,
    projectId,
    embed: input.full ? 'full' : '1',
    theme: input.theme?.trim() || undefined,
  });
}
