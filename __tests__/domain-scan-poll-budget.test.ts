import { describe, expect, it } from 'vitest'
import {
  DOMAIN_SCAN_POLL_ABSOLUTE_MAX_MS,
  domainScanPollMaxMs,
} from '@/lib/integrations/domain-scan-poll-budget'

describe('domainScanPollMaxMs', () => {
  it('scales above the old fixed 12 minute budget for EQC quick (50 pages)', () => {
    const budget = domainScanPollMaxMs(50)
    expect(budget).toBeGreaterThan(12 * 60 * 1000)
    expect(budget).toBeLessThan(DOMAIN_SCAN_POLL_ABSOLUTE_MAX_MS)
  })

  it('keeps a floor for tiny crawls and does not clip large crawls to 14 minutes', () => {
    expect(domainScanPollMaxMs(1)).toBe(6 * 60 * 1000)
    expect(domainScanPollMaxMs(1000)).toBeGreaterThan(30 * 60 * 1000)
    expect(domainScanPollMaxMs(2000)).toBe(DOMAIN_SCAN_POLL_ABSOLUTE_MAX_MS)
  })
})
