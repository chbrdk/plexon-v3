import { describe, expect, it } from 'vitest'
import { domainScanPollMaxMs } from '@/lib/integrations/domain-scan-poll-budget'

describe('domainScanPollMaxMs', () => {
  it('scales above the old fixed 12 minute budget for EQC quick (50 pages)', () => {
    const budget = domainScanPollMaxMs(50)
    expect(budget).toBeGreaterThan(12 * 60 * 1000)
    expect(budget).toBeLessThanOrEqual(14 * 60 * 1000)
  })

  it('keeps a floor for tiny crawls and a ceiling under the 900s route', () => {
    expect(domainScanPollMaxMs(1)).toBe(6 * 60 * 1000)
    expect(domainScanPollMaxMs(1000)).toBe(14 * 60 * 1000)
  })
})
