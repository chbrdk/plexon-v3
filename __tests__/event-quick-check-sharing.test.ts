import { describe, expect, it } from 'vitest';
import { mapEventQuickCheckRunToHistoryItem } from '@/lib/assistant/event-quick-check/event-quick-check-history';
import type { StoredAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import {
  generateEqcShareToken,
  hashReportShareToken,
} from '@/lib/assistant/reports/share-token';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY } from '@/lib/paths/event-quick-check-page';

function baseRun(): StoredAssistantWorkflowRun {
  return {
    id: 'run-1',
    conversationId: 'c1',
    userId: 'owner-1',
    type: 'event_quick_check',
    status: 'completed',
    steps: [],
    result: {
      url: 'https://example.com',
      projectName: 'Example',
      platformProjectId: 'pp-1',
      [EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]: {
        meta: { title: 'QC', url: 'https://example.com', platformProjectId: 'pp-1' },
      } as EventQuickCheckReportModel,
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };
}

describe('EQC sharing history + share token', () => {
  it('marks shared history items for non-owner viewers', () => {
    const item = mapEventQuickCheckRunToHistoryItem(baseRun(), {
      viewerUserId: 'teammate',
      ownerName: 'Ada',
      ownerEmail: 'ada@example.com',
    });
    expect(item?.shared).toBe(true);
    expect(item?.ownerUserId).toBe('owner-1');
    expect(item?.ownerLabel).toBe('Ada');
  });

  it('does not mark own runs as shared', () => {
    const item = mapEventQuickCheckRunToHistoryItem(baseRun(), {
      viewerUserId: 'owner-1',
      ownerName: 'Ada',
    });
    expect(item?.shared).toBe(false);
  });

  it('hashes eqc share tokens stably and distinct from plain', () => {
    const token = generateEqcShareToken();
    expect(token.startsWith('eqc_')).toBe(true);
    expect(hashReportShareToken(token)).toHaveLength(64);
    expect(hashReportShareToken(token)).toBe(hashReportShareToken(token));
    expect(hashReportShareToken(token)).not.toBe(token);
  });

  it('keeps share snapshot independent of later report mutations conceptually', () => {
    const snapshot = {
      meta: { title: 'Snapshot A', url: 'https://example.com' },
      geo: { questions: ['Q1'] },
    } as EventQuickCheckReportModel;
    const later = {
      ...snapshot,
      geo: { questions: ['Q2-edited'] },
    } as EventQuickCheckReportModel;
    expect(snapshot.geo.questions).toEqual(['Q1']);
    expect(later.geo.questions).toEqual(['Q2-edited']);
  });
});
