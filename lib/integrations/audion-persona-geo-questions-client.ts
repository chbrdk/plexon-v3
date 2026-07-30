import { getAudionServiceToken } from '@/lib/constants';
import { audionApiPersonaGeoQuestions } from '@/lib/paths/audion-api';
import {
  formatAudionHttpFailure,
  getAudionUrlDiagnostics,
  isAudionHtmlOrLoginRedirect,
} from '@/lib/integrations/audion-connectivity';
import {
  normalizeAudionPersonaOutputLocale,
  PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE,
  type AudionPersonaOutputLocale,
} from '@/lib/integrations/audion-persona-locale';

const AUDION_PERSONA_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAudionPersonaUuid(personaId: string): boolean {
  return AUDION_PERSONA_UUID_RE.test(personaId.trim());
}

export type AudionPersonaGeoQuestionsResult =
  | { ok: true; questions: string[] }
  | { ok: false; error: string };

export async function fetchAudionPersonaGeoQuestions(input: {
  personaId: string;
  brandName?: string;
  brandUrl?: string;
  count?: number;
  outputLocale?: AudionPersonaOutputLocale;
}): Promise<AudionPersonaGeoQuestionsResult> {
  const token = getAudionServiceToken();
  if (!token) return { ok: false, error: 'AUDION_API_TOKEN fehlt' };
  const diag = getAudionUrlDiagnostics();
  if (diag.looksLikeWebApp) {
    return { ok: false, error: 'AUDION_API_URL zeigt auf Web-App (ohne /api)' };
  }

  const outputLocale = normalizeAudionPersonaOutputLocale(
    input.outputLocale ?? PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE
  );
  const url = audionApiPersonaGeoQuestions(input.personaId);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      max_items: input.count ?? 3,
      output_locale: outputLocale,
      brand_name: input.brandName?.trim() || undefined,
      brand_url: input.brandUrl?.trim() || undefined,
    }),
    cache: 'no-store',
    redirect: 'manual',
  });
  const body = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      error: formatAudionHttpFailure(res.status, res.headers.get('content-type'), body, 'AUDION GEO-Fragen'),
    };
  }
  if (isAudionHtmlOrLoginRedirect(res.headers.get('content-type'), body)) {
    return { ok: false, error: 'AUDION lieferte HTML statt JSON' };
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return { ok: false, error: 'AUDION GEO-Fragen: ungültiges JSON' };
  }

  const raw = json.questions;
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'AUDION GEO-Fragen: questions fehlt' };
  }
  const questions = raw.map((q) => String(q).trim()).filter(Boolean);
  if (!questions.length) {
    return { ok: false, error: 'AUDION GEO-Fragen: leere Liste' };
  }
  return { ok: true, questions };
}
