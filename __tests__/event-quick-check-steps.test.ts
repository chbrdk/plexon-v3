import { describe, expect, it } from 'vitest';
import {
  EVENT_QUICK_CHECK_INITIAL_STEPS,
  buildEventQuickCheckInitialSteps,
} from '@/lib/assistant/ui-blocks/event-quick-check-steps';

describe('event-quick-check-steps', () => {
  it('matches exported initial steps from builder', () => {
    expect(EVENT_QUICK_CHECK_INITIAL_STEPS).toEqual(buildEventQuickCheckInitialSteps());
  });

  it('omits ECHON step when feature flag is off', () => {
    const ids = buildEventQuickCheckInitialSteps().map((s) => s.id);
    expect(ids).not.toContain('echon_market_research');
    expect(ids).not.toContain('competitors_suggest');
    expect(ids[0]).toBe('prepare');
    expect(ids[1]).toBe('company_research');
    expect(ids[2]).toBe('company_brief_confirm');
    expect(ids[3]).toBe('create_project');
    expect(ids).toContain('geo_questions_confirm');
  });

  it('includes competitor steps for complete depth', () => {
    const ids = buildEventQuickCheckInitialSteps('complete').map((s) => s.id);
    expect(ids).toContain('competitors_suggest');
    expect(ids).toContain('competitors_confirm');
    expect(ids.indexOf('competitors_confirm')).toBeLessThan(ids.indexOf('domain_scan'));
  });
});
