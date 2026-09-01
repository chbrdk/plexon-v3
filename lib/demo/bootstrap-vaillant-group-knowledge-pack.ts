/**
 * Idempotent Knowledge Pack seed for Vaillant Group MaFo (UC1 + UC2 research_brief).
 * @see knowledge/vaillant-group-mafo-demo.md
 */

import {
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  assertFacetSize,
  mergeFacetData,
  normalizeResearchBriefData,
  toKnowledgePackResponse,
  type KnowledgePackFacets,
} from '@/lib/collection-knowledge-pack';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import { buildVaillantGroupResearchBriefSeed } from '@/lib/demo/vaillant-group-knowledge-seed';
import { isVaillantGroupCollection } from '@/lib/demo/vaillant-group-mafo';

export type BootstrapVaillantGroupKnowledgeResult = {
  ok: boolean;
  platformProjectId?: string;
  revision?: number;
  skipped?: boolean;
  error?: string;
};

function researchBriefSeeded(data: ReturnType<typeof normalizeResearchBriefData>): boolean {
  return (
    data.sections.some((s) => s.id === 'uc1-hypotheses') &&
    data.sections.some((s) => s.id === 'uc2-opportunity-map')
  );
}

export async function ensureVaillantGroupKnowledgePackSeed(input: {
  platformProjectId: string;
}): Promise<BootstrapVaillantGroupKnowledgeResult> {
  const platformProjectId = input.platformProjectId.trim();
  if (!isVaillantGroupCollection(platformProjectId)) {
    return {
      ok: false,
      error: 'Not the Vaillant Group Collection — refusing to seed (use Vaillant Group only).',
    };
  }

  const seedData = buildVaillantGroupResearchBriefSeed();
  const at = new Date().toISOString();

  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await getOrCreateKnowledgePack(platformProjectId);
    const pack = toKnowledgePackResponse(current);
    const existing = normalizeResearchBriefData(pack.facets.research_brief.data);

    if (researchBriefSeeded(existing)) {
      return {
        ok: true,
        platformProjectId,
        revision: current.revision,
        skipped: true,
      };
    }

    const merged = mergeFacetData('research_brief', existing, seedData);
    assertFacetSize('research_brief', merged);

    const facetDocument = {
      facetId: 'research_brief' as const,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      updatedAt: at,
      provenance: {
        actorType: 'system' as const,
        productId: 'plexon' as const,
        note: 'Vaillant Group MaFo demo seed (UC1+UC2)',
      },
      data: merged,
    } as KnowledgePackFacets['research_brief'];

    const result = await patchKnowledgePackFacet({
      platformProjectId,
      facetId: 'research_brief',
      facetDocument,
      expectedRevision: current.revision,
    });

    if (result === 'conflict') continue;
    if (!result) {
      return { ok: false, error: 'Knowledge pack patch failed' };
    }

    return {
      ok: true,
      platformProjectId,
      revision: result.revision,
      skipped: false,
    };
  }

  return { ok: false, error: 'Knowledge pack revision conflict after retries' };
}
