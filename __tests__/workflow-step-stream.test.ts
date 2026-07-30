import { describe, expect, it, vi } from 'vitest';
import { ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID } from '@/lib/assistant/ui-constants';
import { metadataWithWorkflowSteps } from '@/lib/assistant/ui-blocks/workflow-ui';
import { resolveMessageUiLayout } from '@/lib/assistant/ui-blocks/parse-metadata';
import {
  emitWorkflowStepsToStream,
  patchWorkflowSteps,
} from '@/lib/assistant/workflows/workflow-step-stream';

describe('workflow-step-stream', () => {
  it('emits ui_block_update for step_list', () => {
    const emit = vi.fn();
    emitWorkflowStepsToStream(
      emit,
      [{ id: 'validate_url', label: 'URL prüfen', status: 'running' }],
      'quick_scan'
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui_block_update',
        block: expect.objectContaining({
          id: ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID,
          type: 'step_list',
        }),
      })
    );
  });

  it('patchWorkflowSteps emits after updating steps', async () => {
    const emit = vi.fn();
    const steps = await patchWorkflowSteps({
      steps: [{ id: 'run_scan', label: 'Scan', status: 'pending' }],
      stepId: 'run_scan',
      patch: { status: 'running', progress: 10 },
      emit,
      workflowType: 'quick_scan',
    });
    expect(steps[0].status).toBe('running');
    expect(emit).toHaveBeenCalled();
  });
});

describe('resolveMessageUiLayout step_list dedup', () => {
  it('does not duplicate step_list when uiLayout already contains workflow steps', () => {
    const meta = metadataWithWorkflowSteps(
      {
        workflowRunId: 'run-1',
        workflowType: 'quick_scan',
        uiLayout: {
          version: 1,
          blocks: [
            {
              id: 'metrics',
              type: 'metric_grid',
              props: { items: [] },
            },
          ],
        },
      },
      [
        { id: 'validate_url', label: 'URL prüfen', status: 'done' },
        { id: 'run_scan', label: 'Scan', status: 'done' },
      ],
      'Accessibility-Scan'
    );
    const layout = resolveMessageUiLayout(meta);
    const stepLists = layout?.blocks.filter((b) => b.type === 'step_list') ?? [];
    expect(stepLists).toHaveLength(1);
    expect(stepLists[0]?.id).toBe(ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID);
  });
});
