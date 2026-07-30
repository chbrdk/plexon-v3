/** User-facing product name (technical id remains `event_quick_check`). */
export const QUICK_CHECK_LABEL = 'Quick Check';

export const QUICK_CHECK_PIN_LABEL = 'Quick-Check-Bericht';

export function quickCheckReportTitle(domain: string): string {
  return `${QUICK_CHECK_LABEL}: ${domain}`;
}

export const QUICK_CHECK_PROMPT_EN = 'Quick check for https://example.com';

export const QUICK_CHECK_PROMPT_DE = 'Quick Check für https://example.com';
