import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { checkionApiScanSummarize } from '@/lib/paths/checkion-api';

export type ScanSummarizePreview = {
  scanId: string;
  summary: string;
  overallGrade?: string;
  themes: Array<{ name: string; description?: string; severity?: string }>;
  recommendations: Array<{ title: string; description: string; priority: number }>;
  modelUsed?: string;
};

export type ScanSummarizeResult =
  | { ok: true; data: ScanSummarizePreview }
  | { ok: false; error: string; missing?: Array<'scanId'> };

export async function fetchCheckionScanSummarize(scanId: string): Promise<ScanSummarizeResult> {
  const id = scanId.trim();
  if (!id) return { ok: false, error: 'Scan-ID fehlt', missing: ['scanId'] };

  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiScanSummarize(id), {
      method: 'POST',
      headers: { Authorization: auth.headers.Authorization },
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Scan-Summary: HTTP ${res.status} – ${body.slice(0, 160)}` };
    }
    const json = JSON.parse(body) as {
      summary?: string;
      overallGrade?: string;
      themes?: ScanSummarizePreview['themes'];
      recommendations?: ScanSummarizePreview['recommendations'];
      modelUsed?: string;
    };
    if (!json.summary?.trim()) {
      return { ok: false, error: 'Scan-Summary ohne Text' };
    }
    return {
      ok: true,
      data: {
        scanId: id,
        summary: json.summary,
        overallGrade: json.overallGrade,
        themes: json.themes ?? [],
        recommendations: json.recommendations ?? [],
        modelUsed: json.modelUsed,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
