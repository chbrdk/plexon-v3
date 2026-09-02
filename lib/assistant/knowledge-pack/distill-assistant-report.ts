/**
 * Plexon Assistant curated report → Collection Knowledge Pack (Wave 1).
 * @see specs/domain/collection-memory-wave1.md
 */

import {
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  mergeFacetData,
  ensureFacetsShape,
  type ResearchBriefData,
  type ResearchSection,
} from '@/lib/collection-knowledge-pack';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import type { ReportNarrative } from '@/lib/assistant/reports/types';

export const ASSISTANT_REPORT_KP_SECTION_ID = 'assistant-report-latest' as const;

export function buildAssistantReportKnowledgeSection(input: {
  reportId: string;
  conversationId: string;
  narrative: ReportNarrative;
  sharePath: string;
}): ResearchSection {
  const findingLines =
    input.narrative.findings?.map((f) => `${f.title}: ${f.description}`.slice(0, 240)) ?? [];
  const recommendationLines =
    input.narrative.recommendations?.map((r) => r.title.slice(0, 160)) ?? [];

  return {
    id: ASSISTANT_REPORT_KP_SECTION_ID,
    title: input.narrative.title.slice(0, 200) || 'Assistant report',
    plainText: [
      input.narrative.executiveSummary || input.narrative.intro,
      input.narrative.fazit ? `Fazit: ${input.narrative.fazit}` : null,
      `reportId=${input.reportId}`,
      `conversationId=${input.conversationId}`,
      `share=${input.sharePath}`,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 12_000),
    bullets: [...findingLines, ...recommendationLines].slice(0, 24),
  };
}

export async function distillAssistantReportToKnowledgePack(input: {
  platformProjectId: string;
  conversationId: string;
  reportId: string;
  narrative: ReportNarrative;
  sharePath: string;
  updatedByUserId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const current = await getOrCreateKnowledgePack(input.platformProjectId);
    const at = new Date().toISOString();
    const facets = ensureFacetsShape(current.facets, at);
    const section = buildAssistantReportKnowledgeSection({
      reportId: input.reportId,
      conversationId: input.conversationId,
      narrative: input.narrative,
      sharePath: input.sharePath,
    });
    const incoming: Partial<ResearchBriefData> = {
      sections: [section],
      topics: ['assistant-report'],
      sourceRunId: input.reportId,
      sourceProjectId: input.conversationId,
    };
    const mergedData = mergeFacetData(
      'research_brief',
      facets.research_brief.data,
      incoming
    ) as ResearchBriefData;

    const result = await patchKnowledgePackFacet({
      platformProjectId: input.platformProjectId,
      facetId: 'research_brief',
      facetDocument: {
        facetId: 'research_brief',
        schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
        updatedAt: at,
        provenance: {
          actorType: 'user',
          actorUserId: input.updatedByUserId ?? null,
          productId: 'plexon',
          note: 'assistant report Wave 1 distillate',
          runId: input.reportId,
          sourceUri: input.sharePath,
        },
        data: mergedData,
      },
      expectedRevision: current.revision,
      updatedByUserId: input.updatedByUserId ?? null,
    });

    if (result === 'conflict') {
      return { ok: false, error: 'Knowledge Pack revision conflict' };
    }
    if (!result) {
      return { ok: false, error: 'Knowledge Pack not found' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
