import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { MarketToAudienceResult } from '@/lib/assistant/playbooks/run-market-to-audience';

export function buildMarketToAudienceLayout(result: MarketToAudienceResult): UiLayout {
  const blocks: UiLayout['blocks'] = [
    {
      id: 'mta-summary',
      type: 'text',
      props: {
        markdown: `## ${result.playbookLabel}\n\n**${result.projectName}** — ${result.outcomes.filter((o) => o.status === 'done').length}/${result.outcomes.length} Schritte erfolgreich`,
      },
    },
  ];

  if (result.marketSummary) {
    blocks.push({
      id: 'mta-market',
      type: 'key_value_list',
      props: {
        title: 'Markt-Highlights (ECHON)',
        items: [
          ...(result.marketSummary.executiveSummary
            ? [{ key: 'Summary', value: result.marketSummary.executiveSummary }]
            : []),
          ...(result.marketSummary.keyFindings ?? []).map((f, i) => ({
            key: `Finding ${i + 1}`,
            value: f,
          })),
        ],
      },
    });
  }

  if (result.createdTargetGroups.length > 0) {
    blocks.push({
      id: 'mta-target-groups',
      type: 'key_value_list',
      props: {
        title: 'Angelegte Zielgruppen (AUDION)',
        items: result.createdTargetGroups.map((tg) => ({
          key: tg.name,
          value: tg.id,
        })),
      },
    });
  }

  if (result.errors.length > 0) {
    blocks.push({
      id: 'mta-errors',
      type: 'alert',
      props: {
        tone: 'warning',
        title: 'Hinweise',
        message: result.errors.join(' · '),
      },
    });
  }

  return { version: UI_LAYOUT_VERSION, blocks, panel: { open: false, blocks: [] } };
}
