import { formatCheckionScanHttpFailure, resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { checkionApiScan } from '@/lib/paths/checkion-api';
import type { ScanResultPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';

export type QuickScanResult =
  | { ok: true; scan: ScanResultPreview }
  | { ok: false; error: string; missing?: Array<'url'> };

function mapScanData(data: Record<string, unknown>): ScanResultPreview {
  const stats = (data.stats as Record<string, number>) ?? {};
  const issues = Array.isArray(data.issues)
    ? (data.issues as Array<Record<string, unknown>>).map((i) => ({
        code: String(i.code ?? ''),
        type: String(i.type ?? 'unknown'),
        message: String(i.message ?? ''),
        selector: String(i.selector ?? ''),
      }))
    : [];
  return {
    id: String(data.id ?? ''),
    url: String(data.url ?? ''),
    score: Number(data.score ?? 0),
    stats: {
      errors: Number(stats.errors ?? 0),
      warnings: Number(stats.warnings ?? 0),
      notices: Number(stats.notices ?? 0),
      total: Number(stats.total ?? 0),
    },
    issues,
  };
}

export async function runCheckionQuickScan(input: {
  url: string;
  checkionProjectId?: string | null;
}): Promise<QuickScanResult> {
  const url = input.url.trim();
  if (!url) {
    return { ok: false, error: 'URL fehlt', missing: ['url'] };
  }

  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const res = await fetch(checkionApiScan(), {
      method: 'POST',
      headers: {
        ...auth.headers,
        'x-checkion-scan-stream': '0',
      },
      body: JSON.stringify({
        url,
        standard: 'WCAG2AA',
        runners: ['axe', 'htmlcs'],
        ...(input.checkionProjectId ? { projectId: input.checkionProjectId } : {}),
      }),
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: formatCheckionScanHttpFailure(res.status, body) };
    }
    const json = JSON.parse(body) as { success?: boolean; data?: Record<string, unknown> };
    const data = json.data ?? (json as Record<string, unknown>);
    const scan = mapScanData(data);
    if (!scan.id) {
      return { ok: false, error: 'CHECKION Scan ohne ID' };
    }
    return { ok: true, scan };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
