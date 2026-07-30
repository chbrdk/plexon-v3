import { describe, expect, it } from 'vitest';
import { quickCheckReportTitle } from '@/lib/assistant/event-quick-check/quick-check-label';
import {
  eventQuickCheckHistoryStatusLabel,
  mapEventQuickCheckRunToHistoryItem,
} from '@/lib/assistant/event-quick-check/event-quick-check-history';
import type { StoredAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY } from '@/lib/paths/event-quick-check-page';

function sampleRun(overrides: Partial<StoredAssistantWorkflowRun> = {}): StoredAssistantWorkflowRun {
  return {
    id: 'run-1',
    conversationId: 'conv-1',
    userId: 'user-1',
    type: 'event_quick_check',
    status: 'completed',
    steps: [],
    result: {
      url: 'https://bvik.org',
      projectName: 'bvik.org',
      [EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]: {
        meta: { domain: 'bvik.org', title: quickCheckReportTitle('bvik.org') },
        domain: { score: 57 },
      },
    },
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:05:00Z'),
    ...overrides,
  };
}

describe('event quick check history', () => {
  it('maps workflow run to history item with domain score', () => {
    const item = mapEventQuickCheckRunToHistoryItem(sampleRun());
    expect(item).toMatchObject({
      workflowRunId: 'run-1',
      url: 'https://bvik.org',
      domain: 'bvik.org',
      status: 'completed',
      hasReport: true,
      domainScore: 57,
    });
  });

  it('returns null when url is missing', () => {
    expect(mapEventQuickCheckRunToHistoryItem(sampleRun({ result: {} }))).toBeNull();
  });

  it('labels status in German', () => {
    expect(eventQuickCheckHistoryStatusLabel('completed')).toBe('Abgeschlossen');
    expect(eventQuickCheckHistoryStatusLabel('failed')).toBe('Fehlgeschlagen');
  });
});
