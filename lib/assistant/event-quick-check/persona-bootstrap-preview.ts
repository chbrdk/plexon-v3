import type {
  PersonaBootstrapPreview,
  PersonaPreviewItem,
} from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';

export type { PersonaPreviewItem };

/** All personas from a bootstrap preview (multi or single). */
export function listPersonasFromPreview(preview?: PersonaBootstrapPreview): PersonaPreviewItem[] {
  if (!preview) return [];
  if (preview.personas?.length) {
    return preview.personas.filter((p) => p.name?.trim());
  }
  if (preview.persona?.name?.trim()) return [preview.persona];
  return [];
}

export function primaryPersonaFromPreview(
  preview?: PersonaBootstrapPreview
): PersonaPreviewItem | undefined {
  return listPersonasFromPreview(preview)[0];
}

export function personaBootstrapDetailLabel(preview: PersonaBootstrapPreview): string {
  const personas = listPersonasFromPreview(preview);
  if (personas.length === 0) return preview.error ?? 'Persona fehlt';
  if (personas.length === 1) return personas[0].name;
  return `${personas.length} Personas: ${personas.map((p) => p.name).join(', ')}`.slice(0, 120);
}

function previewFromOutcomeData(data: unknown): PersonaBootstrapPreview | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const preview = (data as { preview?: unknown }).preview;
  if (!preview || typeof preview !== 'object') return undefined;
  const typed = preview as PersonaBootstrapPreview;
  return listPersonasFromPreview(typed).length ? typed : undefined;
}

function previewFromGeoGroups(
  groups: PersonaGeoQuestionGroup[] | undefined,
  projectName: string
): PersonaBootstrapPreview | undefined {
  if (!groups?.length) return undefined;
  const personas: PersonaPreviewItem[] = groups
    .filter((g) => g.personaName?.trim())
    .map((g) => ({
      id: g.personaId || `persona-${g.personaName}`,
      name: g.personaName.trim(),
      segment: g.segment?.trim() || g.personaName.trim(),
      confidence: 0,
      headline: '',
    }));
  if (!personas.length) return undefined;
  return {
    projectId: '',
    projectName,
    targetGroupId: '',
    targetGroupName: '',
    persona: personas[0],
    personas,
  };
}

/**
 * Prefer live preview; fall back to persona_bootstrap outcome payload or
 * GEO question groups (name/segment only) so the report still shows personas.
 */
export function resolvePersonaPreviewForReport(input: {
  personaPreview?: PersonaBootstrapPreview;
  outcomes?: Array<{ stepId: string; data?: unknown }>;
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  projectName?: string;
}): PersonaBootstrapPreview | undefined {
  if (listPersonasFromPreview(input.personaPreview).length) {
    return input.personaPreview;
  }
  const fromOutcome = input.outcomes
    ?.map((o) => (o.stepId === 'persona_bootstrap' ? previewFromOutcomeData(o.data) : undefined))
    .find(Boolean);
  if (fromOutcome) return fromOutcome;
  return previewFromGeoGroups(input.geoQuestionsByPersona, input.projectName ?? '');
}
