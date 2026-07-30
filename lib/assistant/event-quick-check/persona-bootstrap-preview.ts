import type {
  PersonaBootstrapPreview,
  PersonaPreviewItem,
} from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';

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
