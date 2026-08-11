/**
 * AUDION Customer Journey detail + optional validate for assistant journey_outline.
 * Distinct from Study/Wave UX agent client (`audion-journey-client.ts`).
 * Spec: specs/domain/assistant-journey-outline.md
 */

import { getAudionServiceToken, getAudionWebOrigin } from '@/lib/constants';
import { buildAudionJourneyUrl } from '@/lib/audion-admin-launch-url';
import {
  fetchAudionPlatformProjectSummary,
  type AudionCatalogJourney,
  type AudionCatalogPersona,
} from '@/lib/platform-project-dashboard-fetch';
import {
  audionPlatformJourneyById,
  audionPlatformJourneyValidate,
} from '@/lib/paths/audion-api';
import type {
  JourneyFindingOutlineInput,
  JourneyMomentOutlineInput,
  JourneyPhaseOutlineInput,
  JourneyQuoteOutlineInput,
  JourneyRecommendationOutlineInput,
} from '@/lib/assistant/ui-blocks/build-journey-outline-ui';

const MOMENT_KINDS = new Set([
  'action',
  'thought',
  'feeling',
  'pain',
  'opportunity',
  'other',
]);

export type JourneyOutlinePreview = {
  journeyId: string;
  journeyName: string;
  journeyHref: string;
  phases: JourneyPhaseOutlineInput[];
  quotes?: JourneyQuoteOutlineInput[];
  findings?: JourneyFindingOutlineInput[];
  recommendations?: JourneyRecommendationOutlineInput[];
  overallFitScore?: number;
  validateRan: boolean;
  validateError?: string;
};

export type JourneyOutlineResult =
  | { ok: true; preview: JourneyOutlinePreview }
  | { ok: false; error: string };

type RawJourneyElement = {
  id?: string;
  kind?: string;
  label?: string;
  order?: number;
};

type RawJourneyPhase = {
  id?: string;
  name?: string;
  order?: number;
  summary?: string | null;
  elements?: RawJourneyElement[];
};

type RawJourneyDetail = {
  id?: string;
  name?: string;
  phases?: RawJourneyPhase[];
};

type RawFriction = {
  description?: string;
  severity?: string;
  personaQuote?: string | null;
};

type RawPhaseValidation = {
  phaseId?: string;
  phaseName?: string;
  status?: string;
  frictionPoints?: RawFriction[];
  recommendations?: string[];
};

type RawValidateResponse = {
  overallFitScore?: number;
  phases?: RawPhaseValidation[];
  error?: string;
};

function normalizeMomentKind(kind: string | undefined): JourneyMomentOutlineInput['kind'] {
  if (kind && MOMENT_KINDS.has(kind)) return kind as JourneyMomentOutlineInput['kind'];
  return 'other';
}

function mapPhases(raw: RawJourneyPhase[] | undefined): JourneyPhaseOutlineInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => typeof p?.id === 'string' && typeof p?.name === 'string')
    .map((p) => ({
      id: p.id as string,
      name: p.name as string,
      order: typeof p.order === 'number' ? p.order : 0,
      summary: p.summary ?? null,
      elements: Array.isArray(p.elements)
        ? p.elements
            .filter((e) => typeof e?.label === 'string' && e.label.trim())
            .map((e) => ({
              id: typeof e.id === 'string' ? e.id : undefined,
              kind: normalizeMomentKind(e.kind),
              label: (e.label as string).trim(),
            }))
        : [],
    }));
}

function frictionSeverity(
  severity: string | undefined
): JourneyFindingOutlineInput['severity'] {
  if (severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  if (severity === 'low') return 'info';
  return 'neutral';
}

function phaseStatusTone(status: string | undefined): JourneyFindingOutlineInput['severity'] {
  if (status === 'critical') return 'error';
  if (status === 'warning') return 'warning';
  if (status === 'good') return 'success';
  return 'neutral';
}

export function mapValidateToOutlineBlocks(report: RawValidateResponse): {
  quotes: JourneyQuoteOutlineInput[];
  findings: JourneyFindingOutlineInput[];
  recommendations: JourneyRecommendationOutlineInput[];
  overallFitScore?: number;
} {
  const quotes: JourneyQuoteOutlineInput[] = [];
  const findings: JourneyFindingOutlineInput[] = [];
  const recommendations: JourneyRecommendationOutlineInput[] = [];
  let priority = 1;

  for (const phase of report.phases ?? []) {
    const phaseName = phase.phaseName?.trim() || phase.phaseId || 'Phase';
    for (const fp of phase.frictionPoints ?? []) {
      const description = fp.description?.trim();
      if (description) {
        findings.push({
          title: phaseName,
          description,
          severity: frictionSeverity(fp.severity) ?? phaseStatusTone(phase.status),
        });
      }
      const quote = fp.personaQuote?.trim();
      if (quote) {
        quotes.push({
          quote,
          attribution: phaseName,
          tone: frictionSeverity(fp.severity) === 'error' ? 'error' : 'warning',
        });
      }
    }
    for (const rec of phase.recommendations ?? []) {
      const title = rec?.trim();
      if (!title) continue;
      recommendations.push({
        title,
        priority: priority++,
        category: phaseName,
      });
    }
  }

  return {
    quotes,
    findings,
    recommendations,
    overallFitScore:
      typeof report.overallFitScore === 'number' ? report.overallFitScore : undefined,
  };
}

function pickCatalogJourney(
  journeys: AudionCatalogJourney[],
  journeyName?: string
): AudionCatalogJourney | null {
  if (!journeys.length) return null;
  const needle = journeyName?.trim().toLowerCase();
  if (needle) {
    const exact = journeys.find((j) => j.name.trim().toLowerCase() === needle);
    if (exact) return exact;
    const partial = journeys.find((j) => j.name.trim().toLowerCase().includes(needle));
    if (partial) return partial;
  }
  return journeys[0] ?? null;
}

async function fetchJourneyDetailJson(
  journeyId: string
): Promise<{ ok: true; detail: RawJourneyDetail } | { ok: false; error: string }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getAudionServiceToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(audionPlatformJourneyById(journeyId), {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'manual',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `AUDION Journey: HTTP ${res.status}${text ? ` – ${text.slice(0, 120)}` : ''}`,
      };
    }
    const detail = JSON.parse(text) as RawJourneyDetail;
    if (!detail?.id || !detail?.name) {
      return { ok: false, error: 'AUDION Journey: Antwort ohne id/name' };
    }
    return { ok: true, detail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function postJourneyValidate(
  journeyId: string,
  personaIds: string[]
): Promise<{ ok: true; report: RawValidateResponse } | { ok: false; error: string }> {
  if (!personaIds.length) {
    return { ok: false, error: 'Keine Persona für Validate im Katalog' };
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = getAudionServiceToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(audionPlatformJourneyValidate(journeyId), {
      method: 'POST',
      headers,
      body: JSON.stringify({ persona_ids: personaIds, mode: 'both' }),
      cache: 'no-store',
      redirect: 'manual',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `AUDION Validate: HTTP ${res.status}${text ? ` – ${text.slice(0, 120)}` : ''}`,
      };
    }
    const report = text ? (JSON.parse(text) as RawValidateResponse) : {};
    if (report.error) return { ok: false, error: report.error };
    return { ok: true, report };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Resolve + fetch journey detail; optionally validate against catalog personas.
 */
export async function runJourneyOutline(input: {
  plexonUserId: string;
  platformProjectId?: string;
  journeyId?: string;
  journeyName?: string;
  validate?: boolean;
}): Promise<JourneyOutlineResult> {
  let journeyId = input.journeyId?.trim() || '';
  let personas: AudionCatalogPersona[] = [];

  if (!journeyId) {
    const platformProjectId = input.platformProjectId?.trim();
    if (!platformProjectId) {
      return {
        ok: false,
        error: 'Bitte ein Projekt im Kontext wählen oder eine Journey-ID angeben.',
      };
    }
    const summary = await fetchAudionPlatformProjectSummary(
      platformProjectId,
      input.plexonUserId
    );
    if (!summary) {
      return { ok: false, error: 'AUDION Katalog für dieses Projekt nicht erreichbar.' };
    }
    personas = summary.personas;
    const picked = pickCatalogJourney(summary.journeys, input.journeyName);
    if (!picked) {
      return {
        ok: false,
        error: summary.journeys.length
          ? `Keine Journey passt zu „${input.journeyName?.trim() || '—'}“.`
          : 'In diesem Projekt gibt es noch keine Journey.',
      };
    }
    journeyId = picked.id;
  } else if (input.platformProjectId?.trim() && input.validate) {
    const summary = await fetchAudionPlatformProjectSummary(
      input.platformProjectId.trim(),
      input.plexonUserId
    );
    personas = summary?.personas ?? [];
  }

  const fetched = await fetchJourneyDetailJson(journeyId);
  if (!fetched.ok) return fetched;

  const phases = mapPhases(fetched.detail.phases);
  const journeyName = fetched.detail.name!.trim();
  const journeyHref = buildAudionJourneyUrl(getAudionWebOrigin(), journeyId);

  const preview: JourneyOutlinePreview = {
    journeyId,
    journeyName,
    journeyHref,
    phases,
    validateRan: false,
  };

  if (input.validate) {
    const personaIds = personas.map((p) => p.id).filter(Boolean).slice(0, 3);
    const validated = await postJourneyValidate(journeyId, personaIds);
    if (validated.ok) {
      const mapped = mapValidateToOutlineBlocks(validated.report);
      preview.validateRan = true;
      preview.quotes = mapped.quotes;
      preview.findings = mapped.findings;
      preview.recommendations = mapped.recommendations;
      preview.overallFitScore = mapped.overallFitScore;
    } else {
      preview.validateRan = false;
      preview.validateError = validated.error;
    }
  }

  return { ok: true, preview };
}
