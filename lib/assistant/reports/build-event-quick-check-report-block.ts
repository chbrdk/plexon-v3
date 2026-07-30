import { randomUUID } from 'crypto';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { WorkflowInsightNarrative } from '@/lib/assistant/insights/types';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import {
  EVENT_QUICK_CHECK_REPORT_BLOCK_TYPE,
  type EventQuickCheckReportModel,
} from '@/lib/assistant/reports/event-quick-check-report-types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';

export function buildEventQuickCheckReportBlock(
  report: EventQuickCheckReportModel,
  id?: string
): ReturnType<typeof createUiBlock> {
  return createUiBlock(
    EVENT_QUICK_CHECK_REPORT_BLOCK_TYPE,
    { report },
    id ?? `eqc-report-${randomUUID()}`
  );
}

export function buildEventQuickCheckReportLayout(
  report: EventQuickCheckReportModel
): UiLayout | { ok: false; error: string } {
  const block = buildEventQuickCheckReportBlock(report);
  if (!block.ok) return block;
  return {
    version: UI_LAYOUT_VERSION,
    blocks: [block.block],
  };
}

export function buildEventQuickCheckReportLayoutFromQuick(
  quick: EventQuickCheckResult,
  narrative?: WorkflowInsightNarrative
): UiLayout | { ok: false; error: string } {
  const model = buildEventQuickCheckReportModel(quick, narrative);
  return buildEventQuickCheckReportLayout(model);
}

export type EventQuickCheckLayoutResult = UiLayout | { ok: false; error: string };

export function isEventQuickCheckLayoutError(
  result: EventQuickCheckLayoutResult
): result is { ok: false; error: string } {
  return 'ok' in result && result.ok === false;
}

/** Always returns a UiLayout — empty fallback when block validation fails. */
export function resolveEventQuickCheckReportLayout(
  quick: EventQuickCheckResult,
  narrative?: WorkflowInsightNarrative
): UiLayout {
  const result = buildEventQuickCheckReportLayoutFromQuick(quick, narrative);
  if (isEventQuickCheckLayoutError(result)) {
    return { version: UI_LAYOUT_VERSION, blocks: [] };
  }
  return result;
}
