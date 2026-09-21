import { audionApiProjectsCreate, audionApiProjectById } from '@/lib/paths/audion-api';
import {
  AUDION_MACHINE_ACTOR_REQUIRED,
  buildAudionMachineHeaders,
  formatAudionHttpFailure,
  getAudionUrlDiagnostics,
  isAudionHtmlOrLoginRedirect,
} from '@/lib/integrations/audion-connectivity';

export type CreateAudionProjectResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string; missing?: Array<'name'> };

export type AudionMachineAuthOptions = {
  /** Session user — required for Access Model B (AUDION machine token is not a viewer). */
  plexonUserId: string;
};

export async function createAudionProject(
  name: string,
  options?: AudionMachineAuthOptions
): Promise<CreateAudionProjectResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: 'Projektname fehlt', missing: ['name'] };
  }

  const actor = options?.plexonUserId?.trim() || '';
  if (!actor) {
    return { ok: false, error: AUDION_MACHINE_ACTOR_REQUIRED };
  }

  const headers = buildAudionMachineHeaders(actor);
  if (!headers) {
    return { ok: false, error: 'AUDION_API_TOKEN fehlt auf PLEXON' };
  }

  const diag = getAudionUrlDiagnostics();
  if (diag.looksLikeWebApp) {
    return { ok: false, error: 'AUDION_API_URL zeigt auf Web-App (ohne /api)' };
  }

  try {
    const res = await fetch(audionApiProjectsCreate(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: trimmed }),
      cache: 'no-store',
      redirect: 'manual',
    });
    const body = await res.text();

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') ?? '';
      return {
        ok: false,
        error: `Redirect nach ${location || '?'} – AUDION_API_URL zeigt auf Web-App, nicht FastAPI`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: formatAudionHttpFailure(
          res.status,
          res.headers.get('content-type'),
          body,
          'AUDION Projekt anlegen'
        ),
      };
    }

    if (isAudionHtmlOrLoginRedirect(res.headers.get('content-type'), body)) {
      return {
        ok: false,
        error: 'AUDION lieferte HTML statt JSON – AUDION_API_URL falsch (fehlt /api?)',
      };
    }

    const json = JSON.parse(body) as { id?: string; name?: string };
    if (!json.id) {
      return { ok: false, error: 'AUDION-Antwort ohne Projekt-ID' };
    }

    return { ok: true, id: json.id, name: json.name?.trim() || trimmed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type UpdateAudionProjectResult = { ok: true } | { ok: false; error: string };

export async function updateAudionProjectCompanyContext(
  projectId: string,
  companyContext: string,
  options?: AudionMachineAuthOptions
): Promise<UpdateAudionProjectResult> {
  const actor = options?.plexonUserId?.trim() || '';
  if (!actor) return { ok: false, error: AUDION_MACHINE_ACTOR_REQUIRED };

  const headers = buildAudionMachineHeaders(actor);
  if (!headers) return { ok: false, error: 'AUDION_API_TOKEN fehlt auf PLEXON' };

  const trimmed = companyContext.trim();
  if (!trimmed) return { ok: false, error: 'company_context leer' };

  try {
    const res = await fetch(audionApiProjectById(projectId), {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ company_context: trimmed }),
      cache: 'no-store',
      redirect: 'manual',
    });
    const body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: formatAudionHttpFailure(
          res.status,
          res.headers.get('content-type'),
          body,
          'AUDION Projekt aktualisieren'
        ),
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
