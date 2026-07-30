import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import type { AssistantHandlerContext } from '@/lib/assistant/handlers/context';
import { buildCompactProjectContextBlock } from '@/lib/assistant/project-context';
import {
  appendCrossBenchmarkBlocks,
  appendInsightBlocksToLayout,
} from '@/lib/assistant/insights/append-insight-blocks';
import { buildWorkflowCrossSignals } from '@/lib/assistant/insights/cross-signals';
import { fetchCrossBenchmarks } from '@/lib/assistant/insights/fetch-cross-benchmarks';
import {
  generateWorkflowInsights,
  workflowLabelForType,
} from '@/lib/assistant/insights/generate-workflow-insights';
import {
  buildWorkflowFollowUps,
  workflowSourceUrl,
} from '@/lib/assistant/insights/follow-up-suggestions';
import type { WorkflowFollowUpPrompt } from '@/lib/assistant/insights/follow-up-suggestions';
import type {
  WorkflowInsightNarrative,
  WorkflowInsightSource,
} from '@/lib/assistant/insights/types';
import { resolveEventQuickCheckReportLayout } from '@/lib/assistant/reports/build-event-quick-check-report-block';

export function isWorkflowInsightsEnabled(): boolean {
  const raw = process.env.ASSISTANT_WORKFLOW_INSIGHTS?.trim().toLowerCase();
  return raw !== 'off' && raw !== 'false' && raw !== '0';
}

export type EnrichWorkflowResult = {
  layout: UiLayout;
  narrative?: WorkflowInsightNarrative;
  assistantInsightMarkdown?: string;
  followUpPrompts?: WorkflowFollowUpPrompt[];
};

function insightMarkdown(narrative: WorkflowInsightNarrative): string {
  const parts = [
    narrative.assessment.trim(),
    narrative.crossComparisons?.length
      ? `\n\n**Quervergleiche:**\n${narrative.crossComparisons.map((c) => `- ${c}`).join('\n')}`
      : '',
    narrative.fazit.trim() ? `\n\n**Fazit:** ${narrative.fazit.trim()}` : '',
  ];
  return parts.filter(Boolean).join('');
}

function eventQuickCheckInsightMarkdown(narrative: WorkflowInsightNarrative): string {
  const fazit = narrative.fazit.trim();
  return fazit ? `**Fazit:** ${fazit}` : '';
}

/**
 * Appends cross-benchmark data + analyst blocks after raw workflow data.
 * Data blocks stay untouched; insights are additive.
 */
export async function enrichWorkflowLayout(
  ctx: AssistantHandlerContext,
  source: WorkflowInsightSource,
  dataLayout: UiLayout
): Promise<EnrichWorkflowResult> {
  if (!isWorkflowInsightsEnabled()) {
    return { layout: dataLayout };
  }

  ctx.emit?.({ type: 'phase', phase: 'workflow', detail: 'insights' });

  const projectContext =
    ctx.platformProjectId && ctx.user.id
      ? await buildCompactProjectContextBlock(ctx.platformProjectId, ctx.user.id, {
          checkionProjectId: ctx.bindingIds?.checkionProjectId,
          audionProjectId: ctx.bindingIds?.audionProjectId,
        })
      : null;

  const url = workflowSourceUrl(source);

  const crossBenchmarks = await fetchCrossBenchmarks({
    workflowType: source.workflowType,
    url,
  });

  const crossSignals = buildWorkflowCrossSignals(source, crossBenchmarks, projectContext);

  const narrative = await generateWorkflowInsights({
    apiKey: process.env.ANTHROPIC_API_KEY,
    workflowLabel: workflowLabelForType(source.workflowType),
    input: {
      source,
      dataLayout:
        source.workflowType === 'event_quick_check'
          ? resolveEventQuickCheckReportLayout(source.quick)
          : dataLayout,
      projectContext,
      crossBenchmarks,
      crossSignals,
    },
  });

  const followUpPrompts = buildWorkflowFollowUps({
    workflowType: source.workflowType,
    url,
    crossSignals,
    narrative,
  });

  if (source.workflowType === 'event_quick_check') {
    return {
      layout: resolveEventQuickCheckReportLayout(source.quick, narrative),
      narrative,
      followUpPrompts,
      assistantInsightMarkdown: eventQuickCheckInsightMarkdown(narrative),
    };
  }

  let layout = appendCrossBenchmarkBlocks(dataLayout, crossBenchmarks);
  layout = appendInsightBlocksToLayout(layout, narrative);

  return {
    layout,
    narrative,
    followUpPrompts,
    assistantInsightMarkdown: insightMarkdown(narrative),
  };
}
