import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { checkionApiProjectsCreate } from '@/lib/paths/checkion-api';

export type CreateCheckionProjectResult =
  | { ok: true; id: string; name: string; domain?: string | null }
  | { ok: false; error: string; missing?: Array<'name'> };

function formatCheckionHttpFailure(status: number, body: string, context: string): string {
  const snippet = body.trim().slice(0, 120).replace(/\s+/g, ' ');
  return snippet ? `${context}: HTTP ${status} – ${snippet}` : `${context}: HTTP ${status}`;
}

export async function createCheckionProject(
  name: string,
  domain?: string | null
): Promise<CreateCheckionProjectResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: 'Projektname fehlt', missing: ['name'] };
  }

  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const res = await fetch(checkionApiProjectsCreate(), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({
        name: trimmed,
        ...(domain?.trim() ? { domain: domain.trim() } : {}),
      }),
      cache: 'no-store',
      redirect: 'manual',
    });
    const body = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        error: formatCheckionHttpFailure(res.status, body, 'CHECKION Projekt anlegen'),
      };
    }

    const json = JSON.parse(body) as {
      success?: boolean;
      id?: string;
      name?: string;
      domain?: string | null;
    };
    if (!json.id) {
      return { ok: false, error: 'CHECKION-Antwort ohne Projekt-ID' };
    }

    return {
      ok: true,
      id: json.id,
      name: json.name?.trim() || trimmed,
      domain: json.domain ?? domain ?? null,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
