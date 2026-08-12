import { afterEach, describe, expect, it } from 'vitest'
import { getCreationServiceApiUrl, getCreationUrl } from '@/lib/constants'
import { getPlatformProductDefinitions } from '@/lib/platform-products'
import { PLATFORM_PRODUCT_IDS } from '@/lib/platform-entitlements'

describe('creation platform registry', () => {
  const prevPublic = process.env.NEXT_PUBLIC_CREATION_URL
  const prevApi = process.env.CREATION_API_URL

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_CREATION_URL
    else process.env.NEXT_PUBLIC_CREATION_URL = prevPublic
    if (prevApi === undefined) delete process.env.CREATION_API_URL
    else process.env.CREATION_API_URL = prevApi
  })

  it('includes creation in product id union', () => {
    expect(PLATFORM_PRODUCT_IDS).toContain('creation')
  })

  it('marks CREATION planned without URL and active with URL', () => {
    delete process.env.NEXT_PUBLIC_CREATION_URL
    const planned = getPlatformProductDefinitions().find((p) => p.id === 'creation')
    expect(planned?.lifecycle).toBe('planned')
    expect(planned?.name).toBe('CREATION')

    process.env.NEXT_PUBLIC_CREATION_URL = 'https://creation-v3.example'
    expect(getCreationUrl()).toBe('https://creation-v3.example')
    expect(getCreationServiceApiUrl()).toBe('https://creation-v3.example')
    const active = getPlatformProductDefinitions().find((p) => p.id === 'creation')
    expect(active?.lifecycle).toBe('active')
    expect(active?.healthUrl).toBe('https://creation-v3.example/api/health')
  })
})
