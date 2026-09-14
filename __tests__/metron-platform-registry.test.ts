import { afterEach, describe, expect, it } from 'vitest'
import { getMetronServiceApiUrl, getMetronUrl } from '@/lib/constants'
import { getPlatformProductDefinitions } from '@/lib/platform-products'
import { PLATFORM_PRODUCT_IDS } from '@/lib/platform-entitlements'

describe('metron platform registry', () => {
  const prevPublic = process.env.NEXT_PUBLIC_METRON_URL
  const prevApi = process.env.METRON_API_URL

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_METRON_URL
    else process.env.NEXT_PUBLIC_METRON_URL = prevPublic
    if (prevApi === undefined) delete process.env.METRON_API_URL
    else process.env.METRON_API_URL = prevApi
  })

  it('includes metron in product id union', () => {
    expect(PLATFORM_PRODUCT_IDS).toContain('metron')
  })

  it('marks METRON planned without URL and active with URL', () => {
    delete process.env.NEXT_PUBLIC_METRON_URL
    const planned = getPlatformProductDefinitions().find((p) => p.id === 'metron')
    expect(planned?.lifecycle).toBe('planned')
    expect(planned?.name).toBe('METRON')

    process.env.NEXT_PUBLIC_METRON_URL = 'https://metron-v3.example'
    expect(getMetronUrl()).toBe('https://metron-v3.example')
    expect(getMetronServiceApiUrl()).toBe('https://metron-v3.example')
    const active = getPlatformProductDefinitions().find((p) => p.id === 'metron')
    expect(active?.lifecycle).toBe('active')
    expect(active?.healthUrl).toBe('https://metron-v3.example/api/health')
  })
})
