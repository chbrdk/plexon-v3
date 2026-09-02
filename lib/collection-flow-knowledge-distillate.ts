/**
 * Best-effort Knowledge Pack distillate after Collection Test Flow run (Wave 4).
 */

import {
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  mergeFacetData,
  ensureFacetsShape,
  type ResearchBriefData,
} from '@/lib/collection-knowledge-pack';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import { buildCollectionKnowledgeSection } from '@/lib/collection-flow-rollup';
import { buildVaillantFlowKnowledgeSection } from '@/lib/demo/vaillant-flow-knowledge-distillate';
import type { CollectionVerdict } from '@/lib/collection-test-flow';

export async function distillCollectionFlowToKnowledgePack(input: {
  platformProjectId: string;
  flowId: string;
  templateId?: string | null;
  verdict: CollectionVerdict;
  scanId?: string | null;
  overallScore?: number | null;
  updatedByUserId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const current = await getOrCreateKnowledgePack(input.platformProjectId);
    const at = new Date().toISOString();
    const facets = ensureFacetsShape(current.facets, at);
    const existing = facets.research_brief;
    const sections = [
      buildCollectionKnowledgeSection({
        verdict: input.verdict,
        flowId: input.flowId,
        scanId: input.scanId,
        overallScore: input.overallScore,
      }),
    ];
    if (input.templateId) {
      const vaillantSection = buildVaillantFlowKnowledgeSection({
        templateId: input.templateId,
        flowId: input.flowId,
        verdict: input.verdict,
        scanId: input.scanId,
        overallScore: input.overallScore,
      });
      if (vaillantSection) sections.push(vaillantSection);
    }
    const incoming: Partial<ResearchBriefData> = {
      sections,
      topics: ['collection-test-flow'],
      sourceRunId: input.flowId,
      sourceProjectId: input.platformProjectId,
    };
    const mergedData = mergeFacetData(
      'research_brief',
      existing.data,
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
          actorType: 'system',
          productId: 'plexon',
          note: 'collection test flow Wave 4 distillate',
          runId: input.flowId,
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
