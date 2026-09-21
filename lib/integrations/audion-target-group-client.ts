import { audionApiTargetGroupsCreate } from '@/lib/paths/audion-api';
import {
  AUDION_MACHINE_ACTOR_REQUIRED,
  buildAudionMachineHeaders,
  formatAudionHttpFailure,
  getAudionUrlDiagnostics,
  isAudionHtmlOrLoginRedirect,
} from '@/lib/integrations/audion-connectivity';
import type { TargetGroupSuggestion } from '@/lib/integrations/echon-market-context';

export type CreateTargetGroupResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };

async function audionPost(
  url: string,
  body: Record<string, unknown>,
  plexonUserId: string
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; error: string }> {
  const actor = plexonUserId.trim();
  if (!actor) return { ok: false, error: AUDION_MACHINE_ACTOR_REQUIRED };
  const headers = buildAudionMachineHeaders(actor);
  if (!headers) return { ok: false, error: 'AUDION_API_TOKEN fehlt' };
  const diag = getAudionUrlDiagnostics();
  if (diag.looksLikeWebApp) {
    return { ok: false, error: 'AUDION_API_URL zeigt auf Web-App (ohne FastAPI)' };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
    redirect: 'manual',
  });
  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      error: formatAudionHttpFailure(res.status, res.headers.get('content-type'), text, 'AUDION target-groups'),
    };
  }
  if (isAudionHtmlOrLoginRedirect(res.headers.get('content-type'), text)) {
    return { ok: false, error: 'AUDION lieferte HTML statt JSON' };
  }
  return { ok: true, json: JSON.parse(text) as Record<string, unknown> };
}

export async function createAudionTargetGroup(input: {
  audionProjectId: string;
  suggestion: TargetGroupSuggestion;
  plexonUserId: string;
}): Promise<CreateTargetGroupResult> {
  const res = await audionPost(
    audionApiTargetGroupsCreate(),
    {
      projectId: input.audionProjectId,
      project_id: input.audionProjectId,
      name: input.suggestion.name,
      segment: input.suggestion.segment,
      description: input.suggestion.description.slice(0, 4000),
    },
    input.plexonUserId
  );
  if (!res.ok) return { ok: false, error: res.error };
  const id = String(res.json.id ?? '').trim();
  if (!id) return { ok: false, error: 'AUDION Zielgruppe ohne ID' };
  return { ok: true, id, name: input.suggestion.name };
}

export async function createAudionTargetGroupsFromSuggestions(input: {
  audionProjectId: string;
  suggestions: TargetGroupSuggestion[];
  plexonUserId: string;
}): Promise<{
  created: Array<{ id: string; name: string }>;
  errors: string[];
}> {
  const created: Array<{ id: string; name: string }> = [];
  const errors: string[] = [];
  for (const suggestion of input.suggestions) {
    const result = await createAudionTargetGroup({
      audionProjectId: input.audionProjectId,
      suggestion,
      plexonUserId: input.plexonUserId,
    });
    if (result.ok) {
      created.push({ id: result.id, name: result.name });
    } else {
      errors.push(`${suggestion.name}: ${result.error}`);
    }
  }
  return { created, errors };
}
