import { asLabelList, humanizeTraitKey } from '@/lib/assistant/reports/format-report-text';
import {
  normalizeAudionPersonaOutputLocale,
  PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE,
  type AudionPersonaOutputLocale,
} from '@/lib/integrations/audion-persona-locale';

export type PersonaProfilePreview = {
  traits: Array<{ name: string; displayName: string; score: number }>;
  goals: string[];
  painPoints: string[];
  bio?: string;
  interests?: string[];
};

export type AudionPersonaPreview = {
  id: string;
  name: string;
  segment: string;
  confidence: number;
  headline: string;
  profile?: PersonaProfilePreview;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function parseTraits(raw: unknown): Array<{ name: string; displayName: string; score: number }> {
  const traits = asRecord(raw);
  if (!traits) return [];
  return Object.entries(traits)
    .map(([name, score]) => ({
      name,
      displayName: humanizeTraitKey(name),
      score: Number(score),
    }))
    .filter((t) => t.name && Number.isFinite(t.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function resolveProfileForLocale(
  json: Record<string, unknown>,
  outputLocale: AudionPersonaOutputLocale
): Record<string, unknown> {
  const base = asRecord(json.profile) ?? json;
  if (outputLocale !== 'de') return base;
  const profileDe = asRecord(json.profile_de);
  if (!profileDe) return base;
  return { ...base, ...profileDe };
}

/** Normalize AUDION PersonaResponse (or legacy flat JSON) for assistant UI. */
export function parseAudionPersonaResponse(
  json: Record<string, unknown>,
  options?: { outputLocale?: AudionPersonaOutputLocale }
): AudionPersonaPreview {
  const outputLocale = normalizeAudionPersonaOutputLocale(
    options?.outputLocale ?? PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE
  );
  const profile = resolveProfileForLocale(json, outputLocale);
  const metadata = asRecord(json.metadata);

  const id = String(
    metadata?.personaId ?? profile.id ?? json.id ?? `persona-${Date.now()}`
  );
  const name = String(profile.name ?? json.name ?? 'Persona');
  const segment = String(profile.segment ?? json.segment ?? name);
  const headlineDe =
    typeof json.headline_de === 'string' && json.headline_de.trim()
      ? json.headline_de.trim()
      : typeof profile.headline_de === 'string' && profile.headline_de.trim()
        ? String(profile.headline_de).trim()
        : '';
  const headlineEn = String(profile.headline ?? json.headline ?? profile.bio ?? 'Generierte Persona');
  const headline = outputLocale === 'de' && headlineDe ? headlineDe : headlineEn;
  const confidence = Number(
    metadata?.confidence ?? profile.confidence ?? json.confidence ?? 0.75
  );

  const traits = parseTraits(profile.traits);
  const goals = asLabelList(profile.goals).length
    ? asLabelList(profile.goals)
    : asStringList(profile.goals);
  const painPoints = asLabelList(profile.pain_points ?? profile.painPoints).length
    ? asLabelList(profile.pain_points ?? profile.painPoints)
    : asStringList(profile.pain_points ?? profile.painPoints);
  const interests = asStringList(profile.interests);
  const bio = typeof profile.bio === 'string' ? profile.bio.trim() : undefined;

  const hasProfile = traits.length > 0 || goals.length > 0 || painPoints.length > 0 || Boolean(bio);

  return {
    id,
    name,
    segment,
    confidence: Number.isFinite(confidence) ? confidence : 0.75,
    headline,
    ...(hasProfile
      ? {
          profile: {
            traits,
            goals: goals.slice(0, 8),
            painPoints: painPoints.slice(0, 8),
            ...(bio ? { bio: bio.slice(0, 500) } : {}),
            ...(interests.length ? { interests: interests.slice(0, 8) } : {}),
          },
        }
      : {}),
  };
}
