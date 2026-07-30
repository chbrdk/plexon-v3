import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { ASSISTANT_CAPABILITIES_SECTIONS } from '@/lib/assistant/capabilities-overview';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export function buildCapabilitiesUiLayout(): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  for (const section of ASSISTANT_CAPABILITIES_SECTIONS) {
    const lines: string[] = [`### ${section.title}`];
    if (section.rows) {
      for (const row of section.rows) {
        lines.push(`- **${row.name}:** ${row.description}`);
      }
    }
    if (section.bullets) {
      for (const b of section.bullets) {
        lines.push(`- ${b}`);
      }
    }
    const block = createUiBlock(
      'corner_tab_section',
      {
        tabLabel: section.id.toUpperCase(),
        title: section.title,
        markdown: lines.join('\n'),
        placement: 'top-left',
      },
      randomUUID()
    );
    if (block.ok) blocks.push(block.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
