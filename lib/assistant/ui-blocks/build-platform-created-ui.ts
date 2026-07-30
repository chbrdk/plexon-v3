import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { buildProjectSummaryLinks } from '@/lib/assistant/ui-blocks/product-links';
import { appendBlocksToLayout, buildUiLayoutFromBlocks } from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import type { CreatePlatformProjectResult } from '@/lib/assistant/workflows/create-platform-project';
import { formatAudionMisconfigHint, getAudionUrlDiagnostics } from '@/lib/integrations/audion-connectivity';

export function buildPlatformCreatedLayout(
  result: CreatePlatformProjectResult & { ok: true; platformProjectId: string },
  projectName: string
): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const summary = createUiBlock(
    'summary_card',
    {
      title: projectName,
      checkionScanCount: null,
      audionPersonaCount: null,
      links: buildProjectSummaryLinks({
        platformProjectId: result.platformProjectId,
        hasCheckion: result.syncResults?.some((r) => r.productId === 'checkion' && r.ok),
        hasAudion: result.syncResults?.some((r) => r.productId === 'audion' && r.ok),
      }),
    },
    randomUUID()
  );
  if (summary.ok) blocks.push(summary.block);

  if (result.syncResults?.length) {
    const syncItems = result.syncResults.map((r) => ({
      label: r.productId,
      value: r.ok
        ? `✓ ${r.externalProjectId ?? 'ok'}`
        : `✗ ${r.error ?? 'fehlgeschlagen'}`,
    }));
    const kv = createUiBlock('key_value_list', { title: 'Synchronisation', items: syncItems }, randomUUID());
    if (kv.ok) blocks.push(kv.block);

    const audionFailed = result.syncResults.find((r) => r.productId === 'audion' && !r.ok);
    if (audionFailed) {
      const diag = getAudionUrlDiagnostics();
      const hint = formatAudionMisconfigHint(diag);
      if (hint) {
        const alert = createUiBlock(
          'alert',
          { title: 'AUDION-Sync', message: hint, tone: 'warning' },
          randomUUID()
        );
        if (alert.ok) blocks.push(alert.block);
      }
    }
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}

export function mergePlatformCreatedWithSteps(
  stepLayout: UiLayout | undefined,
  platformLayout: UiLayout
): UiLayout {
  return appendBlocksToLayout(stepLayout, platformLayout.blocks);
}
