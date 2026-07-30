import { randomUUID } from 'crypto';
import type { UiBlock, UiLayout, UiTone } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import type { ReportNarrative } from '@/lib/assistant/reports/types';

function pushBlock(blocks: UiBlock[], created: ReturnType<typeof createUiBlock>): void {
  if (created.ok) blocks.push(created.block);
}

/**
 * Compose final report layout with structured UI blocks (alerts, findings, recommendations).
 */
export function buildReportLayout(narrative: ReportNarrative, pinnedBlocks: UiBlock[]): UiLayout {
  const blocks: UiBlock[] = [];

  pushBlock(
    blocks,
    createUiBlock(
      'text',
      { markdown: `# ${narrative.title}\n\n${narrative.intro}` },
      `report-intro-${randomUUID()}`
    )
  );

  pushBlock(
    blocks,
    createUiBlock(
      'alert',
      {
        title: 'Zusammenfassung',
        message: narrative.executiveSummary,
        tone: 'info',
      },
      `report-summary-${randomUUID()}`
    )
  );

  if (narrative.highlights?.length) {
    pushBlock(
      blocks,
      createUiBlock(
        'metric_grid',
        {
          title: 'Kernkennzahlen',
          items: narrative.highlights.map((h) => ({
            label: h.label,
            value: h.value,
            unit: h.unit,
            tone: h.tone,
          })),
        },
        `report-highlights-${randomUUID()}`
      )
    );
  }

  if (narrative.findings?.length) {
    pushBlock(
      blocks,
      createUiBlock(
        'finding_list',
        {
          title: 'Erkenntnisse',
          items: narrative.findings.map((f) => ({
            title: f.title,
            description: f.description,
            severity: f.severity ?? 'info',
          })),
        },
        `report-findings-${randomUUID()}`
      )
    );
  }

  for (const block of pinnedBlocks) {
    blocks.push({
      ...block,
      id: `report-pin-${block.id}`,
      meta: { ...block.meta, source: 'plexon_ui' },
    });
  }

  const fazitTone: UiTone = narrative.fazitTone ?? 'success';
  pushBlock(
    blocks,
    createUiBlock(
      'alert',
      {
        title: 'Fazit',
        message: narrative.fazit,
        tone: fazitTone,
      },
      `report-fazit-${randomUUID()}`
    )
  );

  if (narrative.recommendations.length > 0) {
    pushBlock(
      blocks,
      createUiBlock(
        'recommendation_list',
        {
          title: 'Handlungsempfehlungen',
          items: narrative.recommendations.map((r) => ({
            title: r.title,
            description: r.description ?? '',
            priority: r.priority,
            category: r.category,
          })),
        },
        `report-recs-${randomUUID()}`
      )
    );
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
