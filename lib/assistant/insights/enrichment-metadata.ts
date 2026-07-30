import type { EnrichWorkflowResult } from '@/lib/assistant/insights/enrich-workflow-layout';

/** Extra assistant_message.metadata fields from workflow insight enrichment. */
export function workflowEnrichmentMetadata(
  enriched: EnrichWorkflowResult
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  if (enriched.narrative) extra.workflowInsights = enriched.narrative;
  if (enriched.followUpPrompts?.length) extra.followUpPrompts = enriched.followUpPrompts;
  return extra;
}
