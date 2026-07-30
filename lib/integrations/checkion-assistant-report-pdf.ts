import { getCheckionServiceApiUrl } from '@/lib/constants';
import { checkionApiPlexonAssistantReportPdf } from '@/lib/paths/checkion-api';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { isPdfBuffer } from '@/lib/assistant/reports/render-assistant-report-pdf-local';
import { PLEXON_SERVICE_SECRET_HEADER } from '@/lib/platform-contract';
import { runtimeEnv } from '@/lib/runtime-env';

export type CheckionAssistantReportPdfResult =
  | { ok: true; pdf: Buffer; filename: string }
  | { ok: false; error: string };

export async function renderAssistantReportPdfViaCheckion(input: {
  title: string;
  uiLayout: UiLayout;
  locale?: 'de' | 'en';
}): Promise<CheckionAssistantReportPdfResult> {
  const secret = runtimeEnv('PLEXON_SERVICE_SECRET');
  if (!secret) {
    return { ok: false, error: 'PLEXON_SERVICE_SECRET not configured' };
  }

  const apiBase = getCheckionServiceApiUrl().replace(/\/+$/, '');
  if (!apiBase) {
    return { ok: false, error: 'CHECKION_API_URL not configured' };
  }

  const url = checkionApiPlexonAssistantReportPdf();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [PLEXON_SERVICE_SECRET_HEADER]: secret,
      },
      body: JSON.stringify({
        title: input.title,
        locale: input.locale ?? 'de',
        uiLayout: input.uiLayout,
      }),
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') ?? '';
    const arrayBuffer = await res.arrayBuffer();
    const pdf = Buffer.from(arrayBuffer);

    if (!res.ok) {
      const errText = pdf.toString('utf8').slice(0, 200);
      return {
        ok: false,
        error: `CHECKION PDF ${res.status}${errText ? `: ${errText}` : ''}`,
      };
    }

    if (!contentType.includes('application/pdf') && !isPdfBuffer(pdf)) {
      return {
        ok: false,
        error: `CHECKION returned non-PDF (${contentType || 'unknown'})`,
      };
    }

    const slug = input.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
    return {
      ok: true,
      pdf,
      filename: `plexon-assistant-report-${slug}.pdf`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'CHECKION PDF request failed' };
  }
}
