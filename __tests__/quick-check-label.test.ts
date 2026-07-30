import { describe, expect, it } from 'vitest';
import {
  QUICK_CHECK_LABEL,
  QUICK_CHECK_PIN_LABEL,
  quickCheckReportTitle,
} from '@/lib/assistant/event-quick-check/quick-check-label';

describe('quick-check-label', () => {
  it('uses Quick Check as display name', () => {
    expect(QUICK_CHECK_LABEL).toBe('Quick Check');
    expect(QUICK_CHECK_PIN_LABEL).toBe('Quick-Check-Bericht');
    expect(quickCheckReportTitle('example.de')).toBe('Quick Check: example.de');
  });
});
