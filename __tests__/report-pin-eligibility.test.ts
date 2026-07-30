import { describe, expect, it } from 'vitest';
import { isUiBlockPinnable, findBlockInMessage } from '@/lib/assistant/reports/pin-eligibility';
import { buildEventQuickCheckReportBlock } from '@/lib/assistant/reports/build-event-quick-check-report-block';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import { eventQuickCheckBvikFixture } from '@/__tests__/fixtures/event-quick-check-report.fixture';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';

const metricBlock: UiBlock = {
  id: 'b1',
  type: 'metric_grid',
  props: { title: 'Scan', items: [{ label: 'Score', value: 90 }] },
};

describe('pin-eligibility', () => {
  it('allows pinning finished content blocks', () => {
    expect(isUiBlockPinnable(metricBlock)).toEqual({ pinnable: true });
  });

  it('blocks pinning while message is streaming', () => {
    expect(isUiBlockPinnable(metricBlock, { streaming: true })).toEqual({
      pinnable: false,
      reason: 'streaming',
    });
  });

  it('blocks step_list with running or pending steps', () => {
    const stepBlock: UiBlock = {
      id: 's1',
      type: 'step_list',
      props: {
        title: 'Workflow',
        steps: [
          { id: '1', label: 'Scan', status: 'done' },
          { id: '2', label: 'GEO', status: 'running' },
        ],
      },
    };
    expect(isUiBlockPinnable(stepBlock)).toEqual({
      pinnable: false,
      reason: 'step_list_in_progress',
    });
  });

  it('allows step_list when all steps are terminal', () => {
    const stepBlock: UiBlock = {
      id: 's2',
      type: 'step_list',
      props: {
        steps: [
          { id: '1', label: 'Scan', status: 'done' },
          { id: '2', label: 'GEO', status: 'error' },
        ],
      },
    };
    expect(isUiBlockPinnable(stepBlock)).toEqual({ pinnable: true });
  });

  it('finds block in message metadata uiLayout', () => {
    const found = findBlockInMessage(
      { uiLayout: { version: 1, blocks: [metricBlock] } },
      'b1'
    );
    expect(found?.type).toBe('metric_grid');
  });
});

  it('allows pinning event_quick_check_report block', () => {
    const model = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture());
    const block = buildEventQuickCheckReportBlock(model);
    expect(block.ok).toBe(true);
    if (!block.ok) return;
    expect(isUiBlockPinnable(block.block).pinnable).toBe(true);
  });
