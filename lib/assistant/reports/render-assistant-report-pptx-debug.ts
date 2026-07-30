import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import {
  fetchAssistantReportPptxDebugPlanViaCheckion,
  type PlexonAssistantPptxDebugPayload,
} from '@/lib/integrations/checkion-assistant-report-pptx';

export type RenderAssistantReportPptxDebugResult =
  | { ok: true; debug: PlexonAssistantPptxDebugPayload; source: 'checkion' }
  | { ok: false; error: string };

/** Returns the CHECKION slide plan JSON for QA (requires CHECKION + service secret). */
export async function renderAssistantReportPptxDebugPlan(input: {
  title: string;
  uiLayout: UiLayout;
  locale?: 'de' | 'en';
}): Promise<RenderAssistantReportPptxDebugResult> {
  return fetchAssistantReportPptxDebugPlanViaCheckion(input);
}
