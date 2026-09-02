/**
 * ECHON market context → Collection Knowledge Pack facet `market_intelligence` (Wave 2).
 * @see specs/domain/echon-collection-binding.md
 */

import {
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  mergeFacetData,
  ensureFacetsShape,
  type MarketIntelligenceData,
} from '@/lib/collection-knowledge-pack';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import type { EchonMarketContext } from '@/lib/integrations/echon-market-context';
import { getEchonUrl } from '@/lib/constants';

export function buildMarketIntelligenceFromEchon(
  market: EchonMarketContext,
  opts?: { briefingId?: string | null }
): MarketIntelligenceData | null {
  if (!market.available) return null;
  const summary =
    market.executiveSummary?.trim().slice(0, 2000) ||
    market.implications?.trim().slice(0, 2000) ||
    null;
  const waveHighlights = (market.keyFindings ?? [])
    .map((f) => f.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!summary && waveHighlights.length === 0) return null;

  const base = getEchonUrl()?.replace(/\/$/, '') ?? '';
  const briefingRefs =
    opts?.briefingId && base
      ? [
          {
            briefingId: opts.briefingId,
            title: 'ECHON research briefing',
            url: `${base}/research/briefings/${opts.briefingId}`,
          },
        ]
      : [];

  return {
    summary,
    topics: [],
    briefingRefs,
    waveHighlights,
    sourceThreadId: market.threadId ?? null,
  };
}

export async function distillEchonMarketToKnowledgePack(input: {
  platformProjectId: string;
  market: EchonMarketContext;
  updatedByUserId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const data = buildMarketIntelligenceFromEchon(input.market);
  if (!data) {
    return { ok: false, error: 'No market distillate' };
  }

  try {
    const current = await getOrCreateKnowledgePack(input.platformProjectId);
    const at = new Date().toISOString();
    const facets = ensureFacetsShape(current.facets, at);
    const mergedData = mergeFacetData(
      'market_intelligence',
      facets.market_intelligence.data,
      data
    ) as MarketIntelligenceData;

    const result = await patchKnowledgePackFacet({
      platformProjectId: input.platformProjectId,
      facetId: 'market_intelligence',
      facetDocument: {
        facetId: 'market_intelligence',
        schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
        updatedAt: at,
        provenance: {
          actorType: 'system',
          productId: 'echon',
          note: 'EQC / Assistant ECHON market distillate (Wave 2)',
          runId: input.market.runId ?? input.market.threadId ?? null,
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
