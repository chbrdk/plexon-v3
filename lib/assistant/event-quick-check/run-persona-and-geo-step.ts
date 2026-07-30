import {
  buildGeoQuestionsWithoutPersona,
  buildMultiPersonaGeoQuestions,
  buildPersonaGeoQuestions,
  type PersonaGeoQuestionGroup,
} from '@/lib/assistant/geo/build-persona-geo-questions';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import {
  listPersonasFromPreview,
  personaBootstrapDetailLabel,
} from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import type { EventQuickCheckStepOutcome } from '@/lib/assistant/playbooks/run-event-quick-check';
import {
  runMultiPersonaBootstrap,
  runPersonaBootstrap,
} from '@/lib/integrations/audion-persona-bootstrap-client';
import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import type { EventQuickCheckProfile } from '@/lib/paths/assistant-workflows';

export type PersonaAndGeoStepResult = {
  personaPreview?: PersonaBootstrapPreview;
  audionProjectId?: string;
  audionSetupRequired: boolean;
  geoQuestions: string[];
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  geoCompetitors: string[];
  personaOutcome: EventQuickCheckStepOutcome;
  geoOutcome: EventQuickCheckStepOutcome;
};

async function buildGeoQuestionsWithoutPersonaLegacy(
  url: string,
  companyBrief?: EventQuickCheckCompanyBrief
) {
  const built = await buildGeoQuestionsWithoutPersona({ url, companyBrief });
  return {
    questions: built.questions,
    competitors: built.competitors,
    error: built.suggestError,
  };
}

/** AUDION persona bootstrap + GEO question draft for Quick / Complete scan. */
export async function runPersonaAndGeoQuestionsStep(input: {
  profile: EventQuickCheckProfile;
  projectName: string;
  url: string;
  audionProjectId?: string;
  companyBrief?: EventQuickCheckCompanyBrief;
  geoCompetitors: string[];
  platformProjectId?: string;
  bindAudion?: (platformProjectId: string, audionProjectId: string) => Promise<void>;
}): Promise<PersonaAndGeoStepResult> {
  let personaPreview: PersonaBootstrapPreview | undefined;
  let audionProjectId = input.audionProjectId;
  let audionSetupRequired = false;
  let geoQuestions: string[] = [];
  let geoQuestionsByPersona: PersonaGeoQuestionGroup[] | undefined;
  let geoCompetitors = [...input.geoCompetitors];

  const useMultiPersona =
    input.profile.personaCount > 1 && Boolean(input.companyBrief);

  if (useMultiPersona && input.companyBrief) {
    const persona = await runMultiPersonaBootstrap({
      projectName: input.projectName,
      existingAudionProjectId: audionProjectId,
      companyBrief: input.companyBrief,
      personaCount: input.profile.personaCount,
    });
    if (!persona.ok) {
      return {
        audionSetupRequired: true,
        geoQuestions: [],
        geoCompetitors,
        personaOutcome: {
          stepId: 'persona_bootstrap',
          label: 'AUDION Personas',
          status: 'error',
          error: persona.error,
        },
        geoOutcome: {
          stepId: 'geo_questions',
          label: 'GEO-Fragen',
          status: 'error',
          error: persona.error,
        },
      };
    }

    personaPreview = persona.preview;
    const personas = listPersonasFromPreview(persona.preview);
    if (personas.length === 0) {
      audionSetupRequired = true;
      const personaOutcome: EventQuickCheckStepOutcome = {
        stepId: 'persona_bootstrap',
        label: 'AUDION Personas',
        status: 'error',
        error: persona.preview.error ?? 'Personas fehlen',
      };
      const fallback = await buildGeoQuestionsWithoutPersonaLegacy(input.url, input.companyBrief);
      geoQuestions = fallback.questions;
      geoCompetitors = geoCompetitors.length ? geoCompetitors : fallback.competitors;
      return {
        personaPreview,
        audionSetupRequired,
        geoQuestions,
        geoCompetitors,
        personaOutcome,
        geoOutcome: {
          stepId: 'geo_questions',
          label: 'GEO-Fragen',
          status: geoQuestions.length ? 'done' : 'error',
          error: geoQuestions.length ? undefined : fallback.error ?? 'Keine Persona',
          data: {
            questions: geoQuestions,
            competitors: geoCompetitors,
            personaMissing: true,
          },
        },
      };
    }

    audionProjectId = persona.preview.projectId;
    audionSetupRequired = false;
    if (input.platformProjectId && input.bindAudion) {
      try {
        await input.bindAudion(input.platformProjectId, persona.preview.projectId);
      } catch {
        /* binding best effort */
      }
    }

    const built = await buildMultiPersonaGeoQuestions({
      url: input.url,
      personas,
      companyBrief: input.companyBrief,
      questionsPerPersona: input.profile.geoQuestionsPerPersona,
    });
    geoQuestions = built.questions;
    geoQuestionsByPersona = built.groups;
    geoCompetitors = geoCompetitors.length ? geoCompetitors : built.competitors;

    return {
      personaPreview,
      audionProjectId,
      audionSetupRequired,
      geoQuestions,
      geoQuestionsByPersona,
      geoCompetitors,
      personaOutcome: {
        stepId: 'persona_bootstrap',
        label: 'AUDION Personas',
        status: 'done',
        data: { preview: persona.preview, personaCount: personas.length },
        ...(persona.preview.error ? { error: persona.preview.error } : {}),
      },
      geoOutcome: {
        stepId: 'geo_questions',
        label: 'GEO-Fragen',
        status: 'done',
        data: {
          questions: geoQuestions,
          geoQuestionsByPersona,
          source: built.source,
          competitors: geoCompetitors,
        },
      },
    };
  }

  const persona = await runPersonaBootstrap({
    projectName: input.projectName,
    existingAudionProjectId: audionProjectId,
    companyBrief: input.companyBrief,
  });

  if (!persona.ok || !persona.preview.persona) {
    audionSetupRequired = true;
    const fallback = await buildGeoQuestionsWithoutPersonaLegacy(input.url, input.companyBrief);
    geoQuestions = fallback.questions;
    geoCompetitors = geoCompetitors.length ? geoCompetitors : fallback.competitors;
    const partial = geoQuestions.length > 0;
    return {
      personaPreview: persona.ok ? persona.preview : undefined,
      audionSetupRequired,
      geoQuestions,
      geoCompetitors,
      personaOutcome: {
        stepId: 'persona_bootstrap',
        label: 'AUDION Persona',
        status: 'error',
        error: persona.ok ? persona.preview.error ?? 'Persona fehlt' : persona.error,
      },
      geoOutcome: {
        stepId: 'geo_questions',
        label: 'GEO-Fragen',
        status: partial ? 'done' : 'error',
        error: partial ? undefined : fallback.error ?? 'Persona erforderlich für vollständige GEO-Fragen',
        data: {
          questions: geoQuestions,
          source: 'checkion_suggest_only',
          competitors: geoCompetitors,
          personaMissing: true,
        },
      },
    };
  }

  personaPreview = persona.preview;
  audionProjectId = persona.preview.projectId;
  audionSetupRequired = false;
  if (input.platformProjectId && input.bindAudion) {
    try {
      await input.bindAudion(input.platformProjectId, persona.preview.projectId);
    } catch {
      /* binding best effort */
    }
  }

  const built = await buildPersonaGeoQuestions({
    url: input.url,
    persona: persona.preview.persona,
    companyBrief: input.companyBrief,
    count: input.profile.geoQuestionsPerPersona,
  });
  geoQuestions = built.questions;
  geoCompetitors = geoCompetitors.length ? geoCompetitors : built.competitors;

  return {
    personaPreview,
    audionProjectId,
    audionSetupRequired,
    geoQuestions,
    geoCompetitors,
    personaOutcome: {
      stepId: 'persona_bootstrap',
      label: 'AUDION Persona',
      status: 'done',
      data: { preview: persona.preview },
    },
    geoOutcome: {
      stepId: 'geo_questions',
      label: 'GEO-Fragen',
      status: 'done',
      data: {
        questions: geoQuestions,
        source: built.source,
        competitors: geoCompetitors,
        suggestError: built.suggestError,
      },
    },
  };
}

export { personaBootstrapDetailLabel };
