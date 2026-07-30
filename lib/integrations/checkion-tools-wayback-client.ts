import { checkionApiToolsWayback } from '@/lib/paths/checkion-api';
import { fetchCheckionToolGet } from '@/lib/integrations/checkion-tools-client';

export type WaybackCheckPreview = {
  url: string;
  available: boolean;
  firstSnapshotUrl: string | null;
  firstSnapshotTimestamp: string | null;
};

export type WaybackCheckResult =
  | { ok: true; data: WaybackCheckPreview }
  | { ok: false; error: string; missing?: Array<'url'> };

export async function fetchCheckionWaybackCheck(url: string): Promise<WaybackCheckResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL fehlt', missing: ['url'] };
  }

  const result = await fetchCheckionToolGet<WaybackCheckPreview>(
    checkionApiToolsWayback(trimmed),
    'Wayback'
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
