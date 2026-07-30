import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { suggestCheckionGeoQueries } from '@/lib/integrations/checkion-geo-client';
import {
  fetchAudionPersonaGeoQuestions,
  isAudionPersonaUuid,
} from '@/lib/integrations/audion-persona-geo-questions-client';
import { EVENT_QUICK_CHECK_GEO_QUESTION_COUNT } from '@/lib/paths/assistant-workflows';
import {
  sanitizePersonaGeoQuestions,
  synthesizeCompanyBriefGeoQuestions,
  synthesizePersonaGeoQuestions,
} from '@/lib/assistant/geo/synthesize-persona-geo-questions';

export type PersonaGeoQuestionsResult = {
  questions: string[];
  competitors: string[];
  source:
    | 'audion_persona'
    | 'persona_llm'
    | 'persona_fallback'
    | 'company_brief_llm'
    | 'company_brief_fallback';
  suggestError?: string;
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

function brandLabel(url: string, companyBrief?: EventQuickCheckCompanyBrief): string {
  return companyBrief?.displayName?.trim() || hostFromUrl(url);
}

function industryLabel(
  persona: NonNullable<PersonaBootstrapPreview['persona']>,
  companyBrief?: EventQuickCheckCompanyBrief
): string {
  const fromBrief = companyBrief?.industry?.trim();
  if (fromBrief) return fromBrief.split(/[,(]/)[0]?.trim() || fromBrief;
  return persona.segment.trim() || 'mein Fachbereich';
}

function personaFallbackQuestions(
  persona: NonNullable<PersonaBootstrapPreview['persona']>,
  url: string,
  count: number,
  companyBrief?: EventQuickCheckCompanyBrief
): string[] {
  const brand = brandLabel(url, companyBrief);
  const industry = industryLabel(persona, companyBrief);
  const profile = persona.profile;
  const pain = profile?.painPoints?.[0];
  const goal = profile?.goals?.[0];
  const role = persona.segment.trim() || persona.name;

  const templates = [
    pain
      ? `Ich habe folgendes Problem: ${pain} — welche Anbieter für ${industry} sollte ich mir ansehen?`
      : `Als ${role}: welche Anbieter für ${industry} gelten aktuell als die besten?`,
    `Lohnt sich ${brand} für jemanden wie mich, der ${persona.headline.toLowerCase()}?`,
    goal
      ? `Ich will ${goal} — wie schneidet ${brand} im Vergleich zu Alternativen ab?`
      : `Welche Alternativen zu ${brand} empfehlen sich für ${role}?`,
    `Was sagen andere Einkäufer über ${brand} im Bereich ${industry}?`,
    `Wen würdest du neben ${brand} noch für ${industry} in Deutschland vergleichen?`,
  ];

  return sanitizePersonaGeoQuestions(templates, count);
}

function companyBriefFallbackQuestions(
  url: string,
  count: number,
  companyBrief: EventQuickCheckCompanyBrief
): string[] {
  const brand = brandLabel(url, companyBrief);
  const industry = companyBrief.industry.trim() || 'dieses Angebot';
  const buyer = companyBrief.targetAudienceHint.trim() || 'Einkäufer';

  const templates = [
    `Welche Anbieter für ${industry} sollte ich als ${buyer} zuerst vergleichen?`,
    `Ist ${brand} ein seriöser Partner für ${industry} — was spricht dafür oder dagegen?`,
    `Welche Alternativen zu ${brand} gibt es für ${industry} in Europa?`,
    `Wer sind die drei stärksten Wettbewerber von ${brand}?`,
  ];

  return sanitizePersonaGeoQuestions(templates, count);
}

export type PersonaGeoQuestionGroup = {
  personaId: string;
  personaName: string;
  segment: string;
  questions: string[];
};

export type MultiPersonaGeoQuestionsResult = {
  groups: PersonaGeoQuestionGroup[];
  questions: string[];
  competitors: string[];
  source: PersonaGeoQuestionsResult['source'];
};

/** Build GEO questions for each persona (complete scan). */
export async function buildMultiPersonaGeoQuestions(input: {
  url: string;
  personas: NonNullable<PersonaBootstrapPreview['persona']>[];
  companyBrief?: EventQuickCheckCompanyBrief;
  questionsPerPersona: number;
}): Promise<MultiPersonaGeoQuestionsResult> {
  const groups: PersonaGeoQuestionGroup[] = [];
  let competitors: string[] = [];
  let source: PersonaGeoQuestionsResult['source'] = 'persona_fallback';

  for (const persona of input.personas) {
    const built = await buildPersonaGeoQuestions({
      url: input.url,
      persona,
      companyBrief: input.companyBrief,
      count: input.questionsPerPersona,
    });
    if (!competitors.length && built.competitors.length) {
      competitors = built.competitors;
    }
    if (built.source === 'audion_persona') source = 'audion_persona';
    else if (built.source === 'persona_llm' && source !== 'audion_persona') {
      source = 'persona_llm';
    }
    groups.push({
      personaId: persona.id,
      personaName: persona.name,
      segment: persona.segment,
      questions: built.questions,
    });
  }

  const questions = groups.flatMap((g) => g.questions);
  return { groups, questions, competitors, source };
}

/** Build persona-authentic GEO questions for competitive check. */
export async function buildPersonaGeoQuestions(input: {
  url: string;
  persona: NonNullable<PersonaBootstrapPreview['persona']>;
  companyBrief?: EventQuickCheckCompanyBrief;
  count?: number;
}): Promise<PersonaGeoQuestionsResult> {
  const count = input.count ?? EVENT_QUICK_CHECK_GEO_QUESTION_COUNT;
  const suggested = await suggestCheckionGeoQueries(input.url);
  const competitors = suggested.ok ? suggested.competitors.slice(0, 5) : [];
  const queryHints = suggested.ok ? suggested.queries.slice(0, 6) : [];
  const brandName = brandLabel(input.url, input.companyBrief);

  if (isAudionPersonaUuid(input.persona.id)) {
    const audion = await fetchAudionPersonaGeoQuestions({
      personaId: input.persona.id,
      brandName,
      brandUrl: input.url,
      count,
    });
    if (audion.ok) {
      const questions = sanitizePersonaGeoQuestions(audion.questions, count);
      if (questions.length) {
        return {
          questions,
          competitors,
          source: 'audion_persona',
          suggestError: suggested.ok ? undefined : suggested.error,
        };
      }
    }
  }

  const llm = await synthesizePersonaGeoQuestions({
    url: input.url,
    persona: input.persona,
    companyBrief: input.companyBrief,
    count,
    checkionQueryHints: queryHints,
    checkionCompetitors: competitors,
  });

  if (llm?.length) {
    return {
      questions: llm,
      competitors,
      source: 'persona_llm',
    };
  }

  return {
    questions: personaFallbackQuestions(input.persona, input.url, count, input.companyBrief),
    competitors,
    source: 'persona_fallback',
    suggestError: suggested.ok ? undefined : suggested.error,
  };
}

/** GEO questions when persona bootstrap failed. */
export async function buildGeoQuestionsWithoutPersona(input: {
  url: string;
  companyBrief?: EventQuickCheckCompanyBrief;
  count?: number;
}): Promise<PersonaGeoQuestionsResult> {
  const count = input.count ?? EVENT_QUICK_CHECK_GEO_QUESTION_COUNT;
  const suggested = await suggestCheckionGeoQueries(input.url);
  const competitors = suggested.ok ? suggested.competitors.slice(0, 5) : [];
  const queryHints = suggested.ok ? suggested.queries.slice(0, 6) : [];

  if (input.companyBrief) {
    const llm = await synthesizeCompanyBriefGeoQuestions({
      url: input.url,
      companyBrief: input.companyBrief,
      count,
      checkionQueryHints: queryHints,
      checkionCompetitors: competitors,
    });
    if (llm?.length) {
      return { questions: llm, competitors, source: 'company_brief_llm' };
    }
    return {
      questions: companyBriefFallbackQuestions(input.url, count, input.companyBrief),
      competitors,
      source: 'company_brief_fallback',
      suggestError: suggested.ok ? undefined : suggested.error,
    };
  }

  return {
    questions: [],
    competitors,
    source: 'persona_fallback',
    suggestError: suggested.ok ? undefined : suggested.error,
  };
}
