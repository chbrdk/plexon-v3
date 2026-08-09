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

/**
 * audion-v3 `POST …/personas/generate` returns `{ personas: [{ id, name, role, … }] }`.
 * Older FastAPI / single PersonaResponse stay as-is.
 */
export function unwrapAudionPersonaGeneratePayload(
  json: Record<string, unknown>
): Record<string, unknown> {
  const list = json.personas;
  if (!Array.isArray(list) || list.length === 0) return json;
  const first = asRecord(list[0]);
  if (!first) return json;
  const role = typeof first.role === 'string' ? first.role.trim() : '';
  const bio = typeof first.bio === 'string' ? first.bio.trim() : undefined;
  const headline =
    typeof first.headline === 'string' && first.headline.trim()
      ? first.headline.trim()
      : role || (typeof first.name === 'string' ? first.name : undefined);
  const archetype =
    typeof first.archetype === 'string' && first.archetype.trim()
      ? first.archetype.trim()
      : undefined;
  const frustrations = first.frustrations ?? first.pain_points ?? first.painPoints;
  return {
    ...json,
    id: first.id ?? json.id,
    name: first.name ?? json.name,
    role: role || undefined,
    segment: first.segment ?? archetype ?? (role || json.segment),
    headline: headline ?? json.headline,
    ...(bio ? { bio } : {}),
    ...(archetype ? { archetype } : {}),
    ...(first.interests !== undefined ? { interests: first.interests } : {}),
    ...(first.goals !== undefined ? { goals: first.goals } : {}),
    ...(first.traits !== undefined ? { traits: first.traits } : {}),
    ...(frustrations !== undefined ? { pain_points: frustrations, frustrations } : {}),
  };
}

/** Normalize AUDION PersonaResponse (or legacy flat JSON) for assistant UI. */
export function parseAudionPersonaResponse(
  json: Record<string, unknown>,
  options?: { outputLocale?: AudionPersonaOutputLocale }
): AudionPersonaPreview {
  const outputLocale = normalizeAudionPersonaOutputLocale(
    options?.outputLocale ?? PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE
  );
  const payload = unwrapAudionPersonaGeneratePayload(json);
  const profile = resolveProfileForLocale(payload, outputLocale);
  const metadata = asRecord(payload.metadata);

  const id = String(
    metadata?.personaId ?? profile.id ?? payload.id ?? `persona-${Date.now()}`
  );
  const name = String(profile.name ?? payload.name ?? 'Persona');
  const segment = String(profile.segment ?? payload.segment ?? payload.role ?? name);
  const headlineDe =
    typeof payload.headline_de === 'string' && payload.headline_de.trim()
      ? payload.headline_de.trim()
      : typeof profile.headline_de === 'string' && profile.headline_de.trim()
        ? String(profile.headline_de).trim()
        : '';
  const headlineEn = String(
    profile.headline ?? payload.headline ?? profile.bio ?? 'Generierte Persona'
  );
  const headline = outputLocale === 'de' && headlineDe ? headlineDe : headlineEn;
  const confidence = Number(
    metadata?.confidence ?? profile.confidence ?? payload.confidence ?? 0.75
  );

  const traits = parseTraits(profile.traits);
  const goals = asLabelList(profile.goals).length
    ? asLabelList(profile.goals)
    : asStringList(profile.goals);
  const painRaw = profile.pain_points ?? profile.painPoints ?? profile.frustrations;
  const painPoints = asLabelList(painRaw).length ? asLabelList(painRaw) : asStringList(painRaw);
  const interests = asStringList(profile.interests);
  const bio = typeof profile.bio === 'string' ? profile.bio.trim() : undefined;

  const hasProfile =
    traits.length > 0 ||
    goals.length > 0 ||
    painPoints.length > 0 ||
    interests.length > 0 ||
    Boolean(bio);

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

/** Parse all personas from an AUDION generate batch response. */
export function parseAudionPersonaGenerateBatch(
  json: Record<string, unknown>,
  options?: { outputLocale?: AudionPersonaOutputLocale }
): AudionPersonaPreview[] {
  const list = json.personas;
  if (!Array.isArray(list) || list.length === 0) {
    const single = parseAudionPersonaResponse(json, options);
    return single?.id ? [single] : [];
  }
  return list
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      return parseAudionPersonaResponse({ ...json, personas: [record] }, options);
    })
    .filter((p): p is AudionPersonaPreview => Boolean(p?.id));
}
