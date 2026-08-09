import { describe, expect, it, vi, beforeEach } from 'vitest';

const getConversation = vi.fn();
const canViewProject = vi.fn();

vi.mock('@/lib/db/assistant-conversations', () => ({
  getAssistantConversationById: (...args: unknown[]) => getConversation(...args),
}));

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: (...args: unknown[]) => canViewProject(...args),
}));

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  getAssistantWorkflowRunById: vi.fn(),
}));

import {
  resolveEqcPlatformProjectId,
  userCanAccessEventQuickCheckRun,
} from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import type { StoredAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY } from '@/lib/paths/event-quick-check-page';

function run(partial: Partial<StoredAssistantWorkflowRun> & { id: string }): StoredAssistantWorkflowRun {
  return {
    conversationId: 'conv-1',
    userId: 'owner-1',
    type: 'event_quick_check',
    status: 'completed',
    steps: [],
    result: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

describe('authorize-event-quick-check-run', () => {
  beforeEach(() => {
    getConversation.mockReset();
    canViewProject.mockReset();
  });

  it('resolves platformProjectId from result, then report, then conversation', async () => {
    expect(
      await resolveEqcPlatformProjectId(
        run({ id: 'r1', result: { platformProjectId: 'pp-result' } })
      )
    ).toBe('pp-result');

    expect(
      await resolveEqcPlatformProjectId(
        run({
          id: 'r2',
          result: {
            [EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]: {
              meta: { platformProjectId: 'pp-report' },
            },
          },
        })
      )
    ).toBe('pp-report');

    getConversation.mockResolvedValueOnce({ platformProjectId: 'pp-conv' });
    expect(await resolveEqcPlatformProjectId(run({ id: 'r3', result: {} }))).toBe('pp-conv');
  });

  it('allows owner without project', async () => {
    getConversation.mockResolvedValueOnce({ platformProjectId: null });
    await expect(
      userCanAccessEventQuickCheckRun({ id: 'owner-1', role: 'user' }, run({ id: 'r1' }))
    ).resolves.toBe(true);
  });

  it('allows company/project viewer via userCanViewPlatformProject', async () => {
    getConversation.mockResolvedValueOnce({ platformProjectId: 'pp-1' });
    canViewProject.mockResolvedValueOnce(true);
    await expect(
      userCanAccessEventQuickCheckRun(
        { id: 'teammate', role: 'user' },
        run({ id: 'r1', result: { platformProjectId: 'pp-1' } })
      )
    ).resolves.toBe(true);
    expect(canViewProject).toHaveBeenCalledWith('teammate', 'user', 'pp-1');
  });

  it('denies stranger when project view is false', async () => {
    canViewProject.mockResolvedValueOnce(false);
    await expect(
      userCanAccessEventQuickCheckRun(
        { id: 'stranger', role: 'user' },
        run({ id: 'r1', result: { platformProjectId: 'pp-1' } })
      )
    ).resolves.toBe(false);
  });

  it('denies stranger when run has no platform project', async () => {
    getConversation.mockResolvedValueOnce({ platformProjectId: null });
    await expect(
      userCanAccessEventQuickCheckRun({ id: 'stranger', role: 'user' }, run({ id: 'r1' }))
    ).resolves.toBe(false);
    expect(canViewProject).not.toHaveBeenCalled();
  });
});
