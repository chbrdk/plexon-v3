import { describe, expect, it } from 'vitest';
import {
  buildWorkflowStepListBlock,
  metadataWithWorkflowSteps,
  upsertStepListInLayout,
  workflowStepListTitle,
} from '@/lib/assistant/ui-blocks/workflow-ui';
import { applyWorkflowStepsToMessages } from '@/lib/assistant/workflow-ui-client';
import { encodeWorkflowUiBlockUpdateEvent } from '@/lib/assistant/workflow-stream';
import { ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID } from '@/lib/assistant/ui-constants';
import { resolveMessageUiLayout } from '@/lib/assistant/ui-blocks/parse-metadata';

describe('workflow-ui', () => {
  it('uses stable block id for workflow step_list', () => {
    const block = buildWorkflowStepListBlock(
      [{ id: 's1', label: 'Sync', status: 'running' }],
      'Research'
    );
    expect(block.id).toBe(ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID);
    expect(block.type).toBe('step_list');
  });

  it('upserts step_list in layout by id', () => {
    const first = upsertStepListInLayout(undefined, [{ id: 'a', label: 'A', status: 'pending' }]);
    const second = upsertStepListInLayout(first, [{ id: 'a', label: 'A', status: 'done' }]);
    expect(second.blocks).toHaveLength(1);
    expect((second.blocks[0].props as { steps: Array<{ status: string }> }).steps[0].status).toBe(
      'done'
    );
  });

  it('builds metadata with uiLayout and legacy workflowSteps', () => {
    const meta = metadataWithWorkflowSteps(
      { workflowRunId: 'run-1', workflowType: 'parallel_research' },
      [{ id: 'bindings', label: 'Bindings', status: 'running' }]
    );
    const layout = resolveMessageUiLayout(meta);
    expect(layout?.blocks.some((b) => b.type === 'step_list')).toBe(true);
    expect(meta.workflowSteps).toHaveLength(1);
    expect(meta.contentType).toBe('ui_composed');
  });

  it('maps workflow type to title', () => {
    expect(workflowStepListTitle('parallel_research')).toBe('Research');
    expect(workflowStepListTitle('create_platform_project')).toBe('Projekt anlegen');
  });
});

describe('workflow-ui-client', () => {
  it('updates assistant message matched by workflowRunId', () => {
    const next = applyWorkflowStepsToMessages(
      [
        {
          id: 'm1',
          role: 'assistant',
          content: 'Research läuft',
          metadata: { workflowRunId: 'run-1', workflowType: 'parallel_research' },
        },
      ],
      'run-1',
      [{ id: 'bindings', label: 'Bindings', status: 'done' }]
    );
    const layout = resolveMessageUiLayout(next[0].metadata);
    expect(layout?.blocks[0].type).toBe('step_list');
  });
});

describe('workflow-stream', () => {
  it('encodes ui_block_update SSE payload', () => {
    const block = buildWorkflowStepListBlock([{ id: 'a', label: 'A', status: 'pending' }]);
    const raw = encodeWorkflowUiBlockUpdateEvent(block);
    const parsed = JSON.parse(raw) as { type: string; block: { type: string } };
    expect(parsed.type).toBe('ui_block_update');
    expect(parsed.block.type).toBe('step_list');
  });
});
