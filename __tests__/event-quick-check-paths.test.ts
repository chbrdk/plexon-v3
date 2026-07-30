import { describe, expect, it } from 'vitest';
import {
  EVENT_QUICK_CHECK_RUN_QUERY_PARAM,
  apiEventQuickCheckRunGeoQuestionsReopen,
  pathEventQuickCheckRun,
} from '@/lib/paths/event-quick-check-page';

describe('event quick check paths', () => {
  it('builds run deep link with query param', () => {
    expect(pathEventQuickCheckRun('abc-123')).toBe(
      `/event-quick-check?${EVENT_QUICK_CHECK_RUN_QUERY_PARAM}=abc-123`
    );
    expect(pathEventQuickCheckRun()).toBe('/event-quick-check');
  });

  it('builds geo reopen path', () => {
    expect(apiEventQuickCheckRunGeoQuestionsReopen('run-1')).toBe(
      '/api/assistant/event-quick-check/runs/run-1/geo-questions/reopen'
    );
  });
});
