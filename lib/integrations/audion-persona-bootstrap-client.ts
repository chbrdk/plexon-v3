import { getAudionServiceToken } from '@/lib/constants';
import {
  audionApiTargetGroupPersonasGenerate,
  audionApiTargetGroupsCreate,
} from '@/lib/paths/audion-api';
import { createAudionProject, updateAudionProjectCompanyContext } from '@/lib/integrations/audion-project-client';
import type { PersonaBootstrapPreview, PersonaPreviewItem } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import {
  deriveBuyerSegments,
  type BuyerSegmentDraft,
} from '@/lib/assistant/event-quick-check/derive-buyer-segments';
import {
  formatAudionHttpFailure,
  getAudionUrlDiagnostics,
  isAudionHtmlOrLoginRedirect,
} from '@/lib/integrations/audion-connectivity';
import { parseAudionPersonaResponse } from '@/lib/integrations/parse-audion-persona-profile';
import {
  buildAudionPersonaGenerateRequestBody,
  normalizeAudionPersonaOutputLocale,
  PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE,
  type AudionPersonaOutputLocale,
} from '@/lib/integrations/audion-persona-locale';

async function audionFetch(
  url: string,
  init: RequestInit
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; error: string }> {
  const token = getAudionServiceToken();
  if (!token) return { ok: false, error: 'AUDION_API_TOKEN fehlt' };
  const diag = getAudionUrlDiagnostics();
  if (diag.looksLikeWebApp) {
    return { ok: false, error: 'AUDION_API_URL zeigt auf Web-App (ohne /api)' };
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
    redirect: 'manual',
  });
  const body = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      error: formatAudionHttpFailure(res.status, res.headers.get('content-type'), body, 'AUDION API'),
    };
  }
  if (isAudionHtmlOrLoginRedirect(res.headers.get('content-type'), body)) {
    return { ok: false, error: 'AUDION lieferte HTML statt JSON' };
  }
  return { ok: true, json: JSON.parse(body) as Record<string, unknown> };
}

export type PersonaBootstrapResult =
  | { ok: true; preview: PersonaBootstrapPreview }
  | { ok: false; error: string; missing?: Array<'name'> };

function randomPersonaId(): string {
  return `persona-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function ensureAudionProject(input: {
  projectName: string;
  existingAudionProjectId?: string | null;
  companyBrief?: EventQuickCheckCompanyBrief;
}): Promise<{ ok: true; projectId: string } | { ok: false; error: string; missing?: Array<'name'> }> {
  let projectId = input.existingAudionProjectId?.trim() || '';
  if (!projectId) {
    const created = await createAudionProject(input.projectName);
    if (!created.ok) {
      return { ok: false, error: created.error, missing: created.missing };
    }
    projectId = created.id;
  }

  const context = input.companyBrief?.companyContext?.trim();
  if (context) {
    await updateAudionProjectCompanyContext(projectId, context);
  }

  return { ok: true, projectId };
}

async function createTargetGroup(
  projectId: string,
  segment: BuyerSegmentDraft
): Promise<{ ok: true; id: string; name: string; segment: string } | { ok: false; error: string }> {
  const tgRes = await audionFetch(audionApiTargetGroupsCreate(), {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      name: segment.name.slice(0, 120),
      segment: segment.segment.slice(0, 120),
      description: segment.description.slice(0, 2000),
    }),
  });
  if (!tgRes.ok) return { ok: false, error: tgRes.error };

  const tgId = String(tgRes.json.id ?? '');
  if (!tgId) return { ok: false, error: 'AUDION Zielgruppe ohne ID' };

  return { ok: true, id: tgId, name: segment.name, segment: segment.segment };
}

async function generatePersonaForTargetGroup(input: {
  targetGroupId: string;
  targetGroupName: string;
  segment: BuyerSegmentDraft;
  outputLocale: AudionPersonaOutputLocale;
}): Promise<{ persona?: PersonaPreviewItem; error?: string }> {
  const personaRes = await audionFetch(audionApiTargetGroupPersonasGenerate(input.targetGroupId), {
    method: 'POST',
    body: JSON.stringify({
      ...buildAudionPersonaGenerateRequestBody({
        segment: input.segment.segment.slice(0, 120),
        description: input.segment.personaDescription.slice(0, 2000),
      }),
      count: 1,
    }),
  });

  if (!personaRes.ok) {
    return { error: `Persona-Generierung (${input.targetGroupName}): ${personaRes.error}` };
  }

  const parsed = parseAudionPersonaResponse(personaRes.json, { outputLocale: input.outputLocale });
  return {
    persona: {
      ...parsed,
      segment: parsed.segment || input.segment.segment,
      targetGroupId: input.targetGroupId,
      targetGroupName: input.targetGroupName,
      ...(parsed.id ? {} : { id: randomPersonaId() }),
    },
  };
}

export async function runPersonaBootstrap(input: {
  projectName?: string;
  targetGroupName?: string;
  existingAudionProjectId?: string | null;
  outputLocale?: AudionPersonaOutputLocale;
  companyBrief?: EventQuickCheckCompanyBrief;
}): Promise<PersonaBootstrapResult> {
  const outputLocale = normalizeAudionPersonaOutputLocale(
    input.outputLocale ?? PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE
  );
  const brief = input.companyBrief;
  const projectName = brief?.displayName?.trim() || input.projectName?.trim() || 'Neues Projekt';
  const tgName =
    input.targetGroupName?.trim() ||
    (brief ? `${brief.targetAudienceHint.slice(0, 72)}` : projectName);
  const tgDescription = brief
    ? [
        `Zielgruppe für ${projectName} (${brief.industry}).`,
        brief.targetAudienceHint,
        brief.disambiguationNote,
      ].join(' ')
    : `Zielgruppe für ${projectName}`;
  const personaDescription = brief
    ? [
        `Buyer-/Nutzer-Persona für ${projectName}.`,
        brief.summary,
        `Branche: ${brief.industry}.`,
        brief.disambiguationNote,
      ].join(' ')
    : tgDescription;

  const project = await ensureAudionProject({
    projectName,
    existingAudionProjectId: input.existingAudionProjectId,
    companyBrief: brief,
  });
  if (!project.ok) {
    return { ok: false, error: project.error, missing: project.missing };
  }

  const segmentDraft: BuyerSegmentDraft = {
    name: tgName.slice(0, 120),
    segment: brief?.industry?.slice(0, 120) || tgName.slice(0, 120),
    description: tgDescription,
    personaDescription,
  };

  const tg = await createTargetGroup(project.projectId, segmentDraft);
  if (!tg.ok) {
    return { ok: false, error: tg.error };
  }

  const generated = await generatePersonaForTargetGroup({
    targetGroupId: tg.id,
    targetGroupName: tg.name,
    segment: segmentDraft,
    outputLocale,
  });

  const preview: PersonaBootstrapPreview = {
    projectId: project.projectId,
    projectName,
    targetGroupId: tg.id,
    targetGroupName: tg.name,
    targetGroups: [{ id: tg.id, name: tg.name, segment: tg.segment }],
  };

  if (generated.persona) {
    preview.persona = generated.persona;
    preview.personas = [generated.persona];
  } else {
    preview.error = generated.error;
  }

  return { ok: true, preview };
}

/** Create multiple AUDION target groups + personas from company brief segments (complete scan). */
export async function runMultiPersonaBootstrap(input: {
  projectName?: string;
  existingAudionProjectId?: string | null;
  outputLocale?: AudionPersonaOutputLocale;
  companyBrief: EventQuickCheckCompanyBrief;
  personaCount: number;
}): Promise<PersonaBootstrapResult> {
  const outputLocale = normalizeAudionPersonaOutputLocale(
    input.outputLocale ?? PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE
  );
  const brief = input.companyBrief;
  const projectName = brief.displayName.trim() || input.projectName?.trim() || 'Neues Projekt';
  const count = Math.max(1, input.personaCount);

  const project = await ensureAudionProject({
    projectName,
    existingAudionProjectId: input.existingAudionProjectId,
    companyBrief: brief,
  });
  if (!project.ok) {
    return { ok: false, error: project.error, missing: project.missing };
  }

  const segments = await deriveBuyerSegments(brief, count);
  const targetGroups: NonNullable<PersonaBootstrapPreview['targetGroups']> = [];
  const personas: PersonaPreviewItem[] = [];
  const errors: string[] = [];

  for (const segment of segments) {
    const tg = await createTargetGroup(project.projectId, segment);
    if (!tg.ok) {
      errors.push(tg.error);
      continue;
    }
    targetGroups.push({ id: tg.id, name: tg.name, segment: tg.segment });

    const generated = await generatePersonaForTargetGroup({
      targetGroupId: tg.id,
      targetGroupName: tg.name,
      segment,
      outputLocale,
    });
    if (generated.persona) {
      personas.push(generated.persona);
    } else if (generated.error) {
      errors.push(generated.error);
    }
  }

  const firstTg = targetGroups[0];
  const preview: PersonaBootstrapPreview = {
    projectId: project.projectId,
    projectName,
    targetGroupId: firstTg?.id ?? '',
    targetGroupName: firstTg?.name ?? projectName,
    targetGroups,
    personas,
    persona: personas[0],
  };

  if (personas.length < count && errors.length) {
    preview.error = errors.join(' · ');
  } else if (personas.length === 0) {
    preview.error = errors[0] ?? 'Keine Personas generiert';
  }

  return { ok: true, preview };
}
