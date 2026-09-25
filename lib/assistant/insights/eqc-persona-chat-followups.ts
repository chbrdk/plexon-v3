/**
 * Assistant follow-up chip after Event Quick Check with personas (Wave C5 polish).
 * @see knowledge/eqc-persona-chat.md
 */

import { listPersonasFromPreview } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import type { ConversationRecommendation } from '@/lib/assistant/insights/follow-up-suggestions';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';

/**
 * Chip that steers free-chat toward Audion persona conversation after EQC.
 * Long sessions still belong in the EQC magazine overlay / Audion `/chat` — not Platform Assistant.
 */
export function buildEqcPersonaChatRecommendations(
  quick: Pick<EventQuickCheckResult, 'personaPreview' | 'audionProjectId'>
): ConversationRecommendation[] {
  const personas = listPersonasFromPreview(quick.personaPreview);
  if (!personas.length) return [];
  if (!quick.audionProjectId?.trim()) return [];

  const primary = personas[0]!;
  const label =
    personas.length === 1
      ? 'Mit Persona sprechen'
      : `Mit ${primary.name} sprechen`;

  return [
    {
      id: 'eqc-persona-chat',
      label,
      prompt: `Sprich mit der Persona ${primary.name} (Audion Chat)`,
      reason: 'EQC → Audion persona chat (audion.persona_chat); Overlay im Magazin für lange Sessions',
    },
  ];
}
