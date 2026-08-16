import { afterEach, describe, expect, it } from 'vitest'
import {
  getDigServiceApiUrl,
  getDigUrl,
  getSpirionServiceApiUrl,
  getSpirionUrl,
} from '@/lib/constants'
import { getPlatformProductDefinitions } from '@/lib/platform-products'
import { PLATFORM_PRODUCT_IDS } from '@/lib/platform-entitlements'
import { getCapability, listCapabilities } from '@/lib/capabilities/catalog'

describe('spirion platform registry', () => {
  const prevPublicSpirion = process.env.NEXT_PUBLIC_SPIRION_URL
  const prevPublicDig = process.env.NEXT_PUBLIC_DIG_URL
  const prevApiSpirion = process.env.SPIRION_API_URL
  const prevApiDig = process.env.DIG_API_URL

  afterEach(() => {
    if (prevPublicSpirion === undefined) delete process.env.NEXT_PUBLIC_SPIRION_URL
    else process.env.NEXT_PUBLIC_SPIRION_URL = prevPublicSpirion
    if (prevPublicDig === undefined) delete process.env.NEXT_PUBLIC_DIG_URL
    else process.env.NEXT_PUBLIC_DIG_URL = prevPublicDig
    if (prevApiSpirion === undefined) delete process.env.SPIRION_API_URL
    else process.env.SPIRION_API_URL = prevApiSpirion
    if (prevApiDig === undefined) delete process.env.DIG_API_URL
    else process.env.DIG_API_URL = prevApiDig
  })

  it('includes spirion in product id union', () => {
    expect(PLATFORM_PRODUCT_IDS).toContain('spirion')
    expect(PLATFORM_PRODUCT_IDS).not.toContain('dig')
  })

  it('marks SPIRION planned without URL and active with URL', () => {
    delete process.env.NEXT_PUBLIC_SPIRION_URL
    delete process.env.NEXT_PUBLIC_DIG_URL
    delete process.env.SPIRION_API_URL
    delete process.env.DIG_API_URL
    const planned = getPlatformProductDefinitions().find((p) => p.id === 'spirion')
    expect(planned?.lifecycle).toBe('planned')
    expect(planned?.name).toBe('SPIRION')

    process.env.NEXT_PUBLIC_SPIRION_URL = 'https://spirion.example'
    expect(getSpirionUrl()).toBe('https://spirion.example')
    expect(getDigUrl()).toBe('https://spirion.example')
    expect(getSpirionServiceApiUrl()).toBe('https://spirion.example')
    expect(getDigServiceApiUrl()).toBe('https://spirion.example')
    const active = getPlatformProductDefinitions().find((p) => p.id === 'spirion')
    expect(active?.lifecycle).toBe('active')
    expect(active?.healthUrl).toBe('https://spirion.example/api/health')
  })

  it('falls back to legacy DIG env vars', () => {
    delete process.env.NEXT_PUBLIC_SPIRION_URL
    delete process.env.SPIRION_API_URL
    process.env.NEXT_PUBLIC_DIG_URL = 'https://dig.public.example'
    process.env.DIG_API_URL = 'https://dig-api.internal.example'
    expect(getSpirionUrl()).toBe('https://dig.public.example')
    expect(getSpirionServiceApiUrl()).toBe('https://dig-api.internal.example')
  })

  it('prefers SPIRION_API_URL for service upsert base', () => {
    process.env.NEXT_PUBLIC_SPIRION_URL = 'https://spirion.public.example'
    process.env.SPIRION_API_URL = 'https://spirion-api.internal.example'
    process.env.DIG_API_URL = 'https://dig-api.legacy.example'
    expect(getSpirionServiceApiUrl()).toBe('https://spirion-api.internal.example')
  })

  it('lists spirion capability stubs', () => {
    const ids = listCapabilities()
      .filter((c) => c.owner === 'spirion')
      .map((c) => c.id)
    expect(ids).toEqual([
      'spirion.capture',
      'spirion.enrich',
      'spirion.reference_search',
      'spirion.reference_pack',
      'spirion.generate',
    ])
    expect(getCapability('spirion.capture')?.surfaces).toEqual({ agent: true, flow: true })
  })
})
