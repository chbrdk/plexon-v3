import { randomUUID } from 'crypto';
import { createUiBlock, isUiBlockType } from '@/lib/assistant/ui-blocks/validate';
import type { UiBlock, UiLayout, UiPanelState } from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_LIMITS, UI_LAYOUT_VERSION, emptyUiLayout } from '@/lib/assistant/ui-blocks/types';

export class UiBlockAccumulator {
  private layout: UiLayout = emptyUiLayout();

  getLayout(): UiLayout {
    return {
      ...this.layout,
      blocks: [...this.layout.blocks],
      panel: this.layout.panel
        ? { ...this.layout.panel, blocks: [...this.layout.panel.blocks] }
        : undefined,
    };
  }

  get blockCount(): number {
    return this.layout.blocks.length;
  }

  clear(scope: 'message' | 'panel' | 'all' = 'message'): void {
    if (scope === 'all') {
      this.layout = emptyUiLayout();
      return;
    }
    if (scope === 'panel') {
      this.layout = { ...this.layout, panel: { open: false, blocks: [] } };
      return;
    }
    this.layout = { ...this.layout, blocks: [] };
  }

  appendBlock(
    type: UiBlock['type'],
    props: unknown,
    meta?: UiBlock['meta']
  ): { ok: true; block: UiBlock } | { ok: false; error: string } {
    if (this.layout.blocks.length >= UI_BLOCK_LIMITS.maxBlocks) {
      return { ok: false, error: `Max ${UI_BLOCK_LIMITS.maxBlocks} UI blocks per message` };
    }
    const id = randomUUID();
    const created = createUiBlock(type, props, id, meta);
    if (!created.ok) return created;
    this.layout = {
      ...this.layout,
      blocks: [...this.layout.blocks, created.block],
    };
    return { ok: true, block: created.block };
  }

  updateBlock(
    id: string,
    props: unknown
  ): { ok: true; block: UiBlock; index: number } | { ok: false; error: string } {
    const index = this.layout.blocks.findIndex((b) => b.id === id);
    if (index < 0) {
      const panelIndex = this.layout.panel?.blocks.findIndex((b) => b.id === id) ?? -1;
      if (panelIndex < 0) return { ok: false, error: `Block not found: ${id}` };
      const existing = this.layout.panel!.blocks[panelIndex];
      const created = createUiBlock(existing.type, props, existing.id, existing.meta);
      if (!created.ok) return created;
      const panelBlocks = [...this.layout.panel!.blocks];
      panelBlocks[panelIndex] = created.block;
      this.layout = {
        ...this.layout,
        panel: { ...this.layout.panel!, blocks: panelBlocks },
      };
      return { ok: true, block: created.block, index: panelIndex };
    }
    const existing = this.layout.blocks[index];
    const created = createUiBlock(existing.type, props, existing.id, existing.meta);
    if (!created.ok) return created;
    const blocks = [...this.layout.blocks];
    blocks[index] = created.block;
    this.layout = { ...this.layout, blocks };
    return { ok: true, block: created.block, index };
  }

  setPanel(input: {
    open: boolean;
    title?: string;
    blocks?: Array<{ type: string; props: unknown }>;
  }): { ok: true; panel: UiPanelState } | { ok: false; error: string } {
    if (!input.open) {
      const panel: UiPanelState = { open: false, title: input.title, blocks: [] };
      this.layout = { ...this.layout, panel };
      return { ok: true, panel };
    }

    const blocks: UiBlock[] = [];
    if (input.blocks) {
      if (input.blocks.length > UI_BLOCK_LIMITS.maxPanelBlocks) {
        return { ok: false, error: `Max ${UI_BLOCK_LIMITS.maxPanelBlocks} panel blocks` };
      }
      for (const raw of input.blocks) {
        const typeRaw = typeof raw.type === 'string' ? raw.type.trim() : '';
        if (!isUiBlockType(typeRaw)) {
          return { ok: false, error: `Unknown panel block type: ${typeRaw}` };
        }
        const created = createUiBlock(typeRaw, raw.props ?? {}, randomUUID());
        if (!created.ok) return created;
        blocks.push(created.block);
      }
    }

    const panel: UiPanelState = {
      open: true,
      title: input.title,
      blocks: blocks.length > 0 ? blocks : (this.layout.panel?.blocks ?? []),
    };
    this.layout = { ...this.layout, panel };
    return { ok: true, panel };
  }
}
