import { describe, expect, it } from 'vitest';
import {
  buildStepListBlock,
  buildSummaryCardBlock,
  buildUiLayoutFromBlocks,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { executePlexonUiTool } from '@/lib/assistant/ui-tools/executor';
import { UiBlockAccumulator } from '@/lib/assistant/ui-tools/accumulator';
import {
  PLEXON_UI_SET_PANEL,
  PLEXON_UI_UPDATE_BLOCK,
} from '@/lib/assistant/ui-tools/definitions';
import { resolveMessageUiLayout } from '@/lib/assistant/ui-blocks/parse-metadata';

describe('build-workflow-ui', () => {
  it('builds step_list block', () => {
    const result = buildStepListBlock([
      { id: 's1', label: 'Sync', status: 'done' },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.block.type).toBe('step_list');
  });

  it('builds summary_card with relative dashboard link', () => {
    const result = buildSummaryCardBlock({
      platformProject: { id: 'pp-1', name: 'Test', companyId: 'c-1' },
      checkion: { scanCount: 3 },
      audion: { personaCount: 2 },
    });
    expect(result.ok).toBe(true);
  });
});

describe('ui-tools phase 2', () => {
  it('updates block by id', () => {
    const acc = new UiBlockAccumulator();
    const append = executePlexonUiTool(
      'plexon_ui_append_block',
      { type: 'alert', props: { message: 'v1' } },
      acc
    );
    expect(append.ok).toBe(true);
    const id = append.blockId!;
    const updated = executePlexonUiTool(
      PLEXON_UI_UPDATE_BLOCK,
      { id, props: { message: 'v2', tone: 'success' } },
      acc
    );
    expect(updated.ok).toBe(true);
    expect(acc.getLayout().blocks[0].props.message).toBe('v2');
  });

  it('opens panel with blocks', () => {
    const acc = new UiBlockAccumulator();
    const result = executePlexonUiTool(
      PLEXON_UI_SET_PANEL,
      {
        open: true,
        title: 'Personas',
        blocks: [
          {
            type: 'persona_card',
            props: {
              personas: [
                {
                  id: 'p1',
                  name: 'Anna',
                  segment: 'Eltern',
                  confidence: 0.9,
                  headline: 'Busy parent',
                },
              ],
            },
          },
        ],
      },
      acc
    );
    expect(result.ok).toBe(true);
    expect(result.panel?.open).toBe(true);
    expect(acc.getLayout().panel?.blocks).toHaveLength(1);
  });
});

describe('parse-metadata legacy', () => {
  it('resolves legacy workflowSteps into ui blocks', () => {
    const layout = resolveMessageUiLayout({
      workflowSteps: [{ id: 'w1', label: 'Research', status: 'running', progress: 40 }],
    });
    expect(layout?.blocks.some((b) => b.type === 'step_list')).toBe(true);
  });

  it('merges stored uiLayout with legacy summary', () => {
    const step = buildStepListBlock([{ id: 'a', label: 'A', status: 'done' }]);
    expect(step.ok).toBe(true);
    if (!step.ok) return;
    const layout = resolveMessageUiLayout({
      uiLayout: buildUiLayoutFromBlocks([step.block]),
      summary: {
        platformProject: { id: 'pp-1', name: 'Projekt' },
        checkion: { scanCount: 1 },
      },
    });
    expect(layout?.blocks.length).toBeGreaterThanOrEqual(2);
  });
});
