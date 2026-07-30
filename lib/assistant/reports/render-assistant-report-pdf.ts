import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { renderAssistantReportPdfViaCheckion } from '@/lib/integrations/checkion-assistant-report-pdf';
import {
  isPdfBuffer,
  renderAssistantReportPdfLocal,
} from '@/lib/assistant/reports/render-assistant-report-pdf-local';

export type RenderAssistantReportPdfResult =
  | { ok: true; pdf: Buffer; filename: string; source: 'checkion' | 'local' }
  | { ok: false; error: string };

function pdfFilename(title: string): string {
  const slug = title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
  return `plexon-assistant-report-${slug}.pdf`;
}

/**
 * Renders assistant report PDF — tries CHECKION print pipeline first, falls back to local @react-pdf.
 */
export async function renderAssistantReportPdf(input: {
  title: string;
  uiLayout: UiLayout;
  locale?: 'de' | 'en';
}): Promise<RenderAssistantReportPdfResult> {
  const filename = pdfFilename(input.title);
  const checkion = await renderAssistantReportPdfViaCheckion(input);

  if (checkion.ok && isPdfBuffer(checkion.pdf)) {
    return { ok: true, pdf: checkion.pdf, filename, source: 'checkion' };
  }

  try {
    const pdf = await renderAssistantReportPdfLocal({
      title: input.title,
      uiLayout: input.uiLayout,
    });
    return { ok: true, pdf, filename, source: 'local' };
  } catch (e) {
    const localError = e instanceof Error ? e.message : 'Local PDF render failed';
    const checkionError = checkion.ok ? 'invalid PDF from CHECKION' : checkion.error;
    return { ok: false, error: `${checkionError}; fallback: ${localError}` };
  }
}
