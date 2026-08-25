import { EQC_LONG_RUNNING_MAX_DURATION_SEC } from '@/lib/assistant/event-quick-check/eqc-api-limits'

/** Default CHECKION domain-scan concurrency (spider env DOMAIN_SCAN_CONCURRENCY). */
const DOMAIN_SCAN_CONCURRENCY_ASSUMED = 3

/** Conservative wall-clock budget per page wave (ms). */
const MS_PER_PAGE_WAVE = 45_000

/** Floor so tiny scans still have room for queue + browser warmup. */
const DOMAIN_POLL_MIN_MS = 6 * 60 * 1000

/**
 * Leave headroom under the EQC / Collection Flow route maxDuration (900s)
 * so the poll fails with a clear error before the platform kills the request.
 */
const DOMAIN_POLL_MAX_MS = Math.max(
  DOMAIN_POLL_MIN_MS,
  (EQC_LONG_RUNNING_MAX_DURATION_SEC - 60) * 1000
)

/**
 * Poll budget for CHECKION domain crawls.
 * Fixed 12 min was too short for EQC quick (~50 pages × ~45s / concurrency 3).
 */
export function domainScanPollMaxMs(maxPages?: number): number {
  const pages =
    typeof maxPages === 'number' && Number.isFinite(maxPages) && maxPages > 0
      ? Math.floor(maxPages)
      : 50
  const waves = Math.ceil(pages / DOMAIN_SCAN_CONCURRENCY_ASSUMED)
  const scaled = waves * MS_PER_PAGE_WAVE
  return Math.min(DOMAIN_POLL_MAX_MS, Math.max(DOMAIN_POLL_MIN_MS, scaled))
}
