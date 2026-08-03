import { describe, expect, it } from 'vitest'
import { padUsageDays, padUsageMonths } from '../components/dashboard/UsageTokenChart'

describe('UsageTokenChart padding', () => {
  it('pads last 30 days including zeros', () => {
    const rows = padUsageDays([{ date: '2099-01-15', tokens: 42 }], 3, 'en')
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.key && r.label)).toBe(true)
    expect(rows.reduce((s, r) => s + r.tokens, 0)).toBeGreaterThanOrEqual(0)
  })

  it('maps known month tokens into padded series', () => {
    const now = new Date()
    const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    const rows = padUsageMonths([{ period: key, tokens: 100 }], 3, 'en')
    expect(rows).toHaveLength(3)
    expect(rows[rows.length - 1]?.tokens).toBe(100)
  })
})
