import {
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

const PERSONA_REQUIRED_ERROR =
  'AUDION-Persona konnte nicht erstellt werden. Bitte AUDION prüfen und Quick Check erneut starten.';

function personaMissingResult(input: {
  error: string;
  personaPreview?: PersonaBootstrapPreview;
  geoCompetitors: string[];
  multi?: boolean;
}): PersonaAndGeoStepResult {
  return {
    personaPreview: input.personaPreview,
    audionSetupRequired: true,
    geoQuestions: [],
    geoCompetitors: input.geoCompetitors,
    personaOutcome: {
      stepId: 'persona_bootstrap',
      label: input.multi ? 'AUDION Personas' : 'AUDION Persona',
      status: 'error',
      error: input.error,
    },
    geoOutcome: {
      stepId: 'geo_questions',
      label: 'GEO-Fragen',
      status: 'error',
      error: PERSONA_REQUIRED_ERROR,
      data: { personaMissing: true },
    },
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
  let geoQuestions: string[] = [];
  let geoQuestionsByPersona: PersonaGeoQuestionGroup[] | undefined;
  let geoCompetitors = [...input.geoCompetitors];

  const useMultiPersona =
    (input.profile.targetGroupCount > 1 || input.profile.personaCount > 1) &&
    Boolean(input.companyBrief);

  if (useMultiPersona && input.companyBrief) {
    const persona = await runMultiPersonaBootstrap({
      projectName: input.projectName,
      existingAudionProjectId: audionProjectId,
      companyBrief: input.companyBrief,
      targetGroupCount: input.profile.targetGroupCount,
      personaCount: input.profile.personaCount,
    });
    if (!persona.ok) {
      return personaMissingResult({
        error: persona.error,
        geoCompetitors,
        multi: true,
      });
    }

    personaPreview = persona.preview;
    const personas = listPersonasFromPreview(persona.preview);
    if (personas.length === 0) {
      return personaMissingResult({
        error: persona.preview.error ?? 'Personas fehlen',
        personaPreview,
        geoCompetitors,
        multi: true,
      });
    }

    audionProjectId = persona.preview.projectId;
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
      audionSetupRequired: false,
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
    return personaMissingResult({
      error: persona.ok ? persona.preview.error ?? 'Persona fehlt' : persona.error,
      personaPreview: persona.ok ? persona.preview : undefined,
      geoCompetitors,
    });
  }

  personaPreview = persona.preview;
  audionProjectId = persona.preview.projectId;
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
    audionSetupRequired: false,
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

export { personaBootstrapDetailLabel, PERSONA_REQUIRED_ERROR };
