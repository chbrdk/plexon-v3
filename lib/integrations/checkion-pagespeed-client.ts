import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { checkionApiToolsPageSpeed } from '@/lib/paths/checkion-api';
import type { PageSpeedPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';

export type PageSpeedResult =
  | { ok: true; data: PageSpeedPreview }
  | { ok: false; error: string; missing?: Array<'url'> };

export async function fetchCheckionPageSpeed(url: string): Promise<PageSpeedResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL fehlt', missing: ['url'] };
  }

  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const res = await fetch(checkionApiToolsPageSpeed(trimmed), {
      headers: { Authorization: auth.headers.Authorization },
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `PageSpeed: HTTP ${res.status} – ${body.slice(0, 120)}` };
    }
    const json = JSON.parse(body) as {
      success?: boolean;
      data?: {
        url?: string;
        performance?: number;
        accessibility?: number;
        bestPractices?: number;
        seo?: number;
      };
    };
    const d = json.data;
    if (!d) {
      return { ok: false, error: 'PageSpeed ohne Daten' };
    }
    return {
      ok: true,
      data: {
        url: d.url ?? trimmed,
        performance: Number(d.performance ?? 0),
        accessibility: Number(d.accessibility ?? 0),
        bestPractices: Number(d.bestPractices ?? 0),
        seo: Number(d.seo ?? 0),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
