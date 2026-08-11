import { randomUUID } from 'crypto';
import type { UiBlock, UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import { buildProjectSummaryLinks } from '@/lib/assistant/ui-blocks/product-links';

export {
  buildStepListBlock,
  buildWorkflowStepListBlock,
  metadataWithWorkflowSteps,
  upsertStepListInLayout,
  workflowStepListTitle,
  PARALLEL_RESEARCH_INITIAL_STEPS,
  CREATE_PRODUCT_PROJECT_INITIAL_STEPS,
  QUICK_SCAN_INITIAL_STEPS,
  PAGESPEED_INITIAL_STEPS,
  PERSONA_BOOTSTRAP_INITIAL_STEPS,
  JOURNEY_OUTLINE_INITIAL_STEPS,
  JOURNEY_GENERATE_INITIAL_STEPS,
  SYNC_DIAGNOSE_INITIAL_STEPS,
  GEO_ANALYSIS_INITIAL_STEPS,
  SSL_CHECK_INITIAL_STEPS,
  WAYBACK_CHECK_INITIAL_STEPS,
  DOMAIN_SCAN_INITIAL_STEPS,
  CONTRAST_CHECK_INITIAL_STEPS,
  READABILITY_CHECK_INITIAL_STEPS,
  SCAN_SUMMARIZE_INITIAL_STEPS,
  QUICK_SCAN_SUMMARIZE_STEP,
  PLAYBOOK_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/workflow-ui';

export type SummaryCardInput = {
  platformProject?: { id?: string; name?: string; companyId?: string };
  checkion?: { scanCount?: number } | null;
  audion?: { personaCount?: number } | null;
};

export function buildSummaryCardBlock(
  input: SummaryCardInput
): { ok: true; block: UiBlock } | { ok: false; error: string } {
  const platformProjectId = input.platformProject?.id;
  const links =
    platformProjectId
      ? buildProjectSummaryLinks({
          platformProjectId,
          platformCompanyId: input.platformProject?.companyId,
          hasCheckion: Boolean(input.checkion),
          hasAudion: Boolean(input.audion),
        })
      : [];

  return createUiBlock(
    'summary_card',
    {
      title: input.platformProject?.name ?? 'Projekt',
      checkionScanCount: input.checkion?.scanCount ?? null,
      audionPersonaCount: input.audion?.personaCount ?? null,
      links: links.length > 0 ? links : undefined,
    },
    randomUUID()
  );
}

export function buildUiLayoutFromBlocks(blocks: UiBlock[]): UiLayout {
  return { version: UI_LAYOUT_VERSION, blocks };
}

export function appendBlocksToLayout(layout: UiLayout | undefined, blocks: UiBlock[]): UiLayout {
  const base = layout ?? buildUiLayoutFromBlocks([]);
  return {
    ...base,
    blocks: [...base.blocks, ...blocks],
  };
}
