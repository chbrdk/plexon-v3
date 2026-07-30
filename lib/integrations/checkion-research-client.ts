import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { checkionApiProjectResearch } from '@/lib/paths/checkion-api';

export type CheckionResearchResult = {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

export async function startCheckionProjectResearch(
  checkionProjectId: string,
  plexonUserId: string,
  options: { url?: string; marketKeys?: string[] } = {}
): Promise<CheckionResearchResult> {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }
  const url = checkionApiProjectResearch(checkionProjectId);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...auth.headers,
      'X-Plexon-User-Id': plexonUserId,
    },
    body: JSON.stringify({
      ...(options.url ? { url: options.url } : {}),
      ...(options.marketKeys?.length ? { marketKeys: options.marketKeys } : {}),
    }),
    cache: 'no-store',
  });
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const err =
      (data && typeof data.error === 'string' ? data.error : null) || text || response.statusText;
    return { ok: false, error: err };
  }
  return { ok: true, data: data ?? {} };
}
