import { EVENT_QUICK_CHECK_SCAN_MAX_PAGES_MAX } from '@/lib/paths/assistant-workflows'

/** Default CHECKION domain-scan concurrency (spider env DOMAIN_SCAN_CONCURRENCY). */
const DOMAIN_SCAN_CONCURRENCY_ASSUMED = 3

/** Conservative wall-clock budget per page wave (ms). */
const MS_PER_PAGE_WAVE = 45_000

/** Floor so tiny scans still have room for queue + browser warmup. */
const DOMAIN_POLL_MIN_MS = 6 * 60 * 1000

/**
 * Hang-safety only (stuck CHECKION job) — NOT tied to HTTP `maxDuration`.
 * Sized for the product max page count so large crawls are not truncated.
 */
export const DOMAIN_SCAN_POLL_ABSOLUTE_MAX_MS =
  Math.ceil(EVENT_QUICK_CHECK_SCAN_MAX_PAGES_MAX / DOMAIN_SCAN_CONCURRENCY_ASSUMED) *
  MS_PER_PAGE_WAVE

/**
 * Poll budget for CHECKION domain crawls.
 * Scales with maxPages; Confirm routes return 202 so HTTP lifetime must not cap this.
 */
export function domainScanPollMaxMs(maxPages?: number): number {
  const pages =
    typeof maxPages === 'number' && Number.isFinite(maxPages) && maxPages > 0
      ? Math.min(EVENT_QUICK_CHECK_SCAN_MAX_PAGES_MAX, Math.floor(maxPages))
      : 50
  const waves = Math.ceil(pages / DOMAIN_SCAN_CONCURRENCY_ASSUMED)
  const scaled = waves * MS_PER_PAGE_WAVE
  return Math.min(DOMAIN_SCAN_POLL_ABSOLUTE_MAX_MS, Math.max(DOMAIN_POLL_MIN_MS, scaled))
}
