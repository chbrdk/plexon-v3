/**
 * Vaillant MaFo flow → Knowledge Pack section distillates (Wave 1).
 * @see specs/domain/collection-memory-wave1.md
 */

import type { ResearchSection } from '@/lib/collection-knowledge-pack';
import {
  COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
  COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
} from '@/lib/collection-test-flow';
import type { CollectionVerdict } from '@/lib/collection-test-flow';
import {
  VAILLANT_GROUP_UC1_BUSINESS_QUESTION,
  VAILLANT_GROUP_UC2_BUSINESS_QUESTION,
} from '@/lib/demo/vaillant-group-knowledge-seed';
import { formatCollectionRateLines, collectionCrossProductRates } from '@/lib/collection-flow-rollup';

export const VAILLANT_UC1_FLOW_KP_SECTION_ID = 'vaillant-uc1-flow-latest' as const;
export const VAILLANT_UC2_FLOW_KP_SECTION_ID = 'vaillant-uc2-flow-latest' as const;

const TEMPLATE_SECTION: Record<
  string,
  { sectionId: string; title: string; businessQuestion: string }
> = {
  [COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH]: {
    sectionId: VAILLANT_UC1_FLOW_KP_SECTION_ID,
    title: 'Vaillant UC1 · Flow run',
    businessQuestion: VAILLANT_GROUP_UC1_BUSINESS_QUESTION,
  },
  [COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL]: {
    sectionId: VAILLANT_UC2_FLOW_KP_SECTION_ID,
    title: 'Vaillant UC2 · Flow run',
    businessQuestion: VAILLANT_GROUP_UC2_BUSINESS_QUESTION,
  },
};

export function vaillantFlowKnowledgeSectionId(templateId: string | null | undefined): string | null {
  if (!templateId) return null;
  return TEMPLATE_SECTION[templateId]?.sectionId ?? null;
}

export function buildVaillantFlowKnowledgeSection(input: {
  templateId: string;
  flowId: string;
  verdict: CollectionVerdict;
  scanId?: string | null;
  overallScore?: number | null;
}): ResearchSection | null {
  const meta = TEMPLATE_SECTION[input.templateId];
  if (!meta) return null;

  const rates = collectionCrossProductRates(input.verdict);
  return {
    id: meta.sectionId,
    title: meta.title,
    plainText: [
      meta.businessQuestion,
      input.verdict.summary,
      `flowId=${input.flowId}`,
      input.scanId ? `scanId=${input.scanId}` : null,
      input.overallScore != null ? `overallScore=${input.overallScore}` : null,
      `collectionReady=${rates.collectionReady}`,
    ]
      .filter(Boolean)
      .join('\n'),
    bullets: formatCollectionRateLines(rates),
  };
}
