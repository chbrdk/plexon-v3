import { getCheckionServiceApiUrl } from '@/lib/constants';
import { checkionApiPlexonAssistantReportPptx } from '@/lib/paths/checkion-api';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { isPptxBuffer } from '@/lib/assistant/reports/render-assistant-report-pptx-local';
import { PLEXON_SERVICE_SECRET_HEADER } from '@/lib/platform-contract';
import { runtimeEnv } from '@/lib/runtime-env';

export type PlexonAssistantPptxDebugSlideSummary = {
  index: number;
  kind: string;
  layout: string;
  title: string;
  summary: string;
  hasVisibleContent: boolean;
};

export type PlexonAssistantPptxDebugPayload = {
  success: true;
  mode: 'plan';
  title: string;
  locale: 'de' | 'en';
  variant: string;
  slideCount: number;
  emptySlideCount: number;
  maxSlides: number;
  uiLayoutBlockCount: number;
  compactedBlockCount: number;
  slides: PlexonAssistantPptxDebugSlideSummary[];
  plan: unknown;
};

export type CheckionAssistantReportPptxResult =
  | { ok: true; pptx: Buffer; filename: string }
  | { ok: false; error: string };

export type CheckionAssistantReportPptxDebugResult =
  | { ok: true; debug: PlexonAssistantPptxDebugPayload; source: 'checkion' }
  | { ok: false; error: string };

export async function fetchAssistantReportPptxDebugPlanViaCheckion(input: {
  title: string;
  uiLayout: UiLayout;
  locale?: 'de' | 'en';
}): Promise<CheckionAssistantReportPptxDebugResult> {
  const secret = runtimeEnv('PLEXON_SERVICE_SECRET');
  if (!secret) {
    return { ok: false, error: 'PLEXON_SERVICE_SECRET not configured' };
  }

  const apiBase = getCheckionServiceApiUrl().replace(/\/+$/, '');
  if (!apiBase) {
    return { ok: false, error: 'CHECKION_API_URL not configured' };
  }

  const url = checkionApiPlexonAssistantReportPptx({ debugPlan: true });
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

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `CHECKION PPTX debug ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = JSON.parse(text) as PlexonAssistantPptxDebugPayload;
    if (!json.success || json.mode !== 'plan') {
      return { ok: false, error: 'CHECKION returned unexpected debug payload' };
    }

    return { ok: true, debug: json, source: 'checkion' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'CHECKION PPTX debug request failed' };
  }
}

export async function renderAssistantReportPptxViaCheckion(input: {
  title: string;
  uiLayout: UiLayout;
  locale?: 'de' | 'en';
}): Promise<CheckionAssistantReportPptxResult> {
  const secret = runtimeEnv('PLEXON_SERVICE_SECRET');
  if (!secret) {
    return { ok: false, error: 'PLEXON_SERVICE_SECRET not configured' };
  }

  const apiBase = getCheckionServiceApiUrl().replace(/\/+$/, '');
  if (!apiBase) {
    return { ok: false, error: 'CHECKION_API_URL not configured' };
  }

  const url = checkionApiPlexonAssistantReportPptx();
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
    const pptx = Buffer.from(arrayBuffer);

    if (!res.ok) {
      const errText = pptx.toString('utf8').slice(0, 200);
      return {
        ok: false,
        error: `CHECKION PPTX ${res.status}${errText ? `: ${errText}` : ''}`,
      };
    }

    if (!contentType.includes('presentationml') && !isPptxBuffer(pptx)) {
      return {
        ok: false,
        error: `CHECKION returned non-PPTX (${contentType || 'unknown'})`,
      };
    }

    const slug = input.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
    return {
      ok: true,
      pptx,
      filename: `plexon-assistant-report-${slug}.pptx`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'CHECKION PPTX request failed' };
  }
}
