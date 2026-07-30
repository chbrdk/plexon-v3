import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { renderAssistantReportPptxViaCheckion } from '@/lib/integrations/checkion-assistant-report-pptx';
import {
  isPptxBuffer,
  renderAssistantReportPptxLocal,
} from '@/lib/assistant/reports/render-assistant-report-pptx-local';

export type RenderAssistantReportPptxResult =
  | { ok: true; pptx: Buffer; filename: string; source: 'checkion' | 'local' }
  | { ok: false; error: string };

function pptxFilename(title: string): string {
  const slug = title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  return `plexon-assistant-report-${slug}.pptx`;
}

/**
 * Renders assistant report PPTX — tries CHECKION MSQDX pipeline first, falls back to local pptxgenjs.
 */
export async function renderAssistantReportPptx(input: {
  title: string;
  uiLayout: UiLayout;
  locale?: 'de' | 'en';
}): Promise<RenderAssistantReportPptxResult> {
  const filename = pptxFilename(input.title);
  const checkion = await renderAssistantReportPptxViaCheckion(input);

  if (checkion.ok && isPptxBuffer(checkion.pptx)) {
    return { ok: true, pptx: checkion.pptx, filename, source: 'checkion' };
  }

  try {
    const pptx = await renderAssistantReportPptxLocal({
      title: input.title,
      uiLayout: input.uiLayout,
    });
    return { ok: true, pptx, filename, source: 'local' };
  } catch (e) {
    const localError = e instanceof Error ? e.message : 'Local PPTX render failed';
    const checkionError = checkion.ok ? 'invalid PPTX from CHECKION' : checkion.error;
    return { ok: false, error: `${checkionError}; fallback: ${localError}` };
  }
}
