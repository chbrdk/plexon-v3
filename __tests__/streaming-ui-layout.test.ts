import { describe, expect, it } from 'vitest';
import { ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID } from '@/lib/assistant/ui-constants';
import {
  mergeStreamingUiBlockUpdate,
  patchStreamingMessageMetadata,
} from '@/lib/assistant/streaming-ui-layout';

describe('streaming-ui-layout', () => {
  it('creates streaming assistant message on first ui_block_update', () => {
    const streamId = 'stream-1';
    const block = {
      id: ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID,
      type: 'step_list' as const,
      props: {
        title: 'Accessibility-Scan',
        steps: [{ id: 'run_scan', label: 'Scan ausführen', status: 'running' as const }],
      },
    };
    const next = mergeStreamingUiBlockUpdate([], streamId, block);
    expect(next).toHaveLength(1);
    expect(next[0].role).toBe('assistant');
    expect(next[0].metadata?.uiLayout).toMatchObject({
      blocks: [block],
    });
  });

  it('upserts block by id on subsequent updates', () => {
    const streamId = 'stream-1';
    const initial = {
      id: ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID,
      type: 'step_list' as const,
      props: {
        steps: [{ id: 'run_scan', label: 'Scan', status: 'running' as const }],
      },
    };
    const withFirst = mergeStreamingUiBlockUpdate([], streamId, initial);
    const updated = {
      ...initial,
      props: {
        steps: [{ id: 'run_scan', label: 'Scan', status: 'done' as const }],
      },
    };
    const withSecond = mergeStreamingUiBlockUpdate(withFirst, streamId, updated);
    expect(withSecond).toHaveLength(1);
    const blocks = (withSecond[0].metadata?.uiLayout as { blocks: unknown[] }).blocks;
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as typeof updated).props.steps[0].status).toBe('done');
  });

  it('patches workflowRunId onto streaming placeholder', () => {
    const next = patchStreamingMessageMetadata([], 'stream-2', {
      workflowRunId: 'run-abc',
      workflowType: 'quick_scan',
    });
    expect(next[0].metadata?.workflowRunId).toBe('run-abc');
  });
});
