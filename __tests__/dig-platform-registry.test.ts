import { afterEach, describe, expect, it } from 'vitest'
import { getDigServiceApiUrl, getDigUrl } from '@/lib/constants'
import { getPlatformProductDefinitions } from '@/lib/platform-products'
import { PLATFORM_PRODUCT_IDS } from '@/lib/platform-entitlements'
import { getCapability, listCapabilities } from '@/lib/capabilities/catalog'

describe('dig platform registry', () => {
  const prevPublic = process.env.NEXT_PUBLIC_DIG_URL
  const prevApi = process.env.DIG_API_URL

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_DIG_URL
    else process.env.NEXT_PUBLIC_DIG_URL = prevPublic
    if (prevApi === undefined) delete process.env.DIG_API_URL
    else process.env.DIG_API_URL = prevApi
  })

  it('includes dig in product id union', () => {
    expect(PLATFORM_PRODUCT_IDS).toContain('dig')
  })

  it('marks DIG planned without URL and active with URL', () => {
    delete process.env.NEXT_PUBLIC_DIG_URL
    delete process.env.DIG_API_URL
    const planned = getPlatformProductDefinitions().find((p) => p.id === 'dig')
    expect(planned?.lifecycle).toBe('planned')
    expect(planned?.name).toBe('DIG')

    process.env.NEXT_PUBLIC_DIG_URL = 'https://dig.example'
    expect(getDigUrl()).toBe('https://dig.example')
    expect(getDigServiceApiUrl()).toBe('https://dig.example')
    const active = getPlatformProductDefinitions().find((p) => p.id === 'dig')
    expect(active?.lifecycle).toBe('active')
    expect(active?.healthUrl).toBe('https://dig.example/api/health')
  })

  it('prefers DIG_API_URL for service upsert base', () => {
    process.env.NEXT_PUBLIC_DIG_URL = 'https://dig.public.example'
    process.env.DIG_API_URL = 'https://dig-api.internal.example'
    expect(getDigServiceApiUrl()).toBe('https://dig-api.internal.example')
  })

  it('lists dig capability stubs', () => {
    const ids = listCapabilities()
      .filter((c) => c.owner === 'dig')
      .map((c) => c.id)
    expect(ids).toEqual([
      'dig.capture',
      'dig.enrich',
      'dig.reference_search',
      'dig.reference_pack',
      'dig.generate',
    ])
    expect(getCapability('dig.capture')?.surfaces).toEqual({ agent: true, flow: true })
  })
})
