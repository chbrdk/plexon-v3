import type {
  PersonaBootstrapPreview,
  PersonaPreviewItem,
  PersonaTargetGroupRef,
} from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import type { PersonaProfilePreview } from '@/lib/integrations/parse-audion-persona-profile';
import { asLabelList } from '@/lib/assistant/reports/format-report-text';

export type { PersonaPreviewItem };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringList(value: unknown): string[] {
  const labeled = asLabelList(value);
  if (labeled.length) return labeled;
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function hydratePersonaProfile(raw: unknown): PersonaProfilePreview | undefined {
  const profile = asRecord(raw);
  if (!profile) return undefined;
  const traitsRaw = profile.traits;
  const traits = Array.isArray(traitsRaw)
    ? traitsRaw
        .map((t) => {
          const row = asRecord(t);
          if (!row) return null;
          const name = typeof row.name === 'string' ? row.name.trim() : '';
          if (!name) return null;
          const displayName =
            typeof row.displayName === 'string' && row.displayName.trim()
              ? row.displayName.trim()
              : name;
          const score = Number(row.score);
          return { name, displayName, score: Number.isFinite(score) ? score : 0 };
        })
        .filter((t): t is { name: string; displayName: string; score: number } => Boolean(t))
    : [];
  const goals = asStringList(profile.goals);
  const painPoints = asStringList(profile.painPoints ?? profile.pain_points);
  const interests = asStringList(profile.interests);
  const bio = typeof profile.bio === 'string' ? profile.bio.trim() : undefined;
  if (!traits.length && !goals.length && !painPoints.length && !interests.length && !bio) {
    return undefined;
  }
  return {
    traits,
    goals,
    painPoints,
    ...(bio ? { bio } : {}),
    ...(interests.length ? { interests } : {}),
  };
}

function hydratePersonaItem(raw: unknown, index: number): PersonaPreviewItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!name) return null;
  const segment =
    (typeof row.segment === 'string' && row.segment.trim()) ||
    (typeof row.role === 'string' && row.role.trim()) ||
    name;
  const headline =
    (typeof row.headline === 'string' && row.headline.trim()) || name;
  const confidence = Number(row.confidence);
  const profile = hydratePersonaProfile(row.profile);
  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `persona-${index + 1}`,
    name,
    segment,
    confidence: Number.isFinite(confidence) ? confidence : 0.8,
    headline,
    ...(profile ? { profile } : {}),
    ...(typeof row.targetGroupId === 'string' && row.targetGroupId.trim()
      ? { targetGroupId: row.targetGroupId.trim() }
      : {}),
    ...(typeof row.targetGroupName === 'string' && row.targetGroupName.trim()
      ? { targetGroupName: row.targetGroupName.trim() }
      : {}),
  };
}

function hydrateTargetGroups(raw: unknown): PersonaTargetGroupRef[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const groups = raw
    .map((item, index) => {
      const row = asRecord(item);
      if (!row) return null;
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      if (!name) return null;
      return {
        id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `tg-${index + 1}`,
        name,
        segment: (typeof row.segment === 'string' && row.segment.trim()) || name,
      };
    })
    .filter((g): g is PersonaTargetGroupRef => Boolean(g));
  return groups.length ? groups : undefined;
}

/** Restore PersonaBootstrapPreview from Collection Flow persona catalog bundle. */
export function personaPreviewFromCatalogBundle(
  bundle: Record<string, unknown> | null | undefined,
  projectName = ''
): PersonaBootstrapPreview | undefined {
  if (!bundle) return undefined;
  const fromList = Array.isArray(bundle.personas)
    ? bundle.personas
        .map((item, index) => hydratePersonaItem(item, index))
        .filter((p): p is PersonaPreviewItem => Boolean(p))
    : [];
  const primary =
    fromList[0] ??
    hydratePersonaItem(
      {
        id: bundle.id,
        name: bundle.name,
        segment: bundle.segment,
        headline: bundle.name,
        confidence: 0.8,
      },
      0
    );
  if (!primary) return undefined;
  const personas = fromList.length ? fromList : [primary];
  const targetGroups = hydrateTargetGroups(bundle.targetGroups);
  return {
    projectId: typeof bundle.id === 'string' ? bundle.id : '',
    projectName: projectName || primary.name,
    targetGroupId: primary.targetGroupId ?? '',
    targetGroupName: primary.targetGroupName || primary.segment || '',
    persona: primary,
    ...(personas.length > 1 ? { personas } : personas.length === 1 ? { personas } : {}),
    ...(targetGroups ? { targetGroups } : {}),
  };
}

/** GEO question groups stored on the persona catalog bundle. */
export function geoQuestionsByPersonaFromCatalogBundle(
  bundle: Record<string, unknown> | null | undefined
): PersonaGeoQuestionGroup[] | undefined {
  const raw = bundle?.geoByPersona;
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const groups = raw
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const personaName = typeof row.personaName === 'string' ? row.personaName.trim() : '';
      const questions = asStringList(row.questions);
      if (!personaName && !questions.length) return null;
      return {
        personaId: typeof row.personaId === 'string' ? row.personaId : '',
        personaName: personaName || 'Persona',
        segment: typeof row.segment === 'string' ? row.segment : '',
        questions,
      } satisfies PersonaGeoQuestionGroup;
    })
    .filter((g): g is PersonaGeoQuestionGroup => Boolean(g));
  return groups.length ? groups : undefined;
}

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

/** Prefer the preview with more personas / richer profiles. */
export function preferRicherPersonaPreview(
  a?: PersonaBootstrapPreview,
  b?: PersonaBootstrapPreview
): PersonaBootstrapPreview | undefined {
  const score = (preview?: PersonaBootstrapPreview) =>
    listPersonasFromPreview(preview).reduce(
      (sum, p) => sum + 1 + (p.profile ? 10 : 0) + (p.headline?.trim() ? 1 : 0),
      0
    );
  const aScore = score(a);
  const bScore = score(b);
  if (bScore > aScore) return b;
  return a ?? b;
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
  const fromOutcome = input.outcomes
    ?.map((o) => (o.stepId === 'persona_bootstrap' ? previewFromOutcomeData(o.data) : undefined))
    .find(Boolean);
  const fromGeo = previewFromGeoGroups(input.geoQuestionsByPersona, input.projectName ?? '');
  return preferRicherPersonaPreview(
    preferRicherPersonaPreview(input.personaPreview, fromOutcome),
    fromGeo
  );
}
