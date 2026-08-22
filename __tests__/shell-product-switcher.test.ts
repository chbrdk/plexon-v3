import { describe, expect, it } from 'vitest'
import { toSwitcherItems } from '@/lib/shell-product-switcher'
import type { PlatformProductSummary } from '@/lib/platform-products'

function product(partial: Partial<PlatformProductSummary> & Pick<PlatformProductSummary, 'id' | 'name'>): PlatformProductSummary {
  return {
    descriptionKey: 'x',
    lifecycle: 'active',
    surface: 'federated',
    promoted: false,
    primaryActionKey: 'x',
    homeUrl: 'https://example.test/',
    loginUrl: null,
    healthUrl: null,
    capabilities: [],
    entryPoints: [{ id: 'home', labelKey: 'x', href: 'https://example.test/', openInNewTab: true }],
    defaultAccess: 'granted',
    runtimeStatus: 'healthy',
    runtimeMessage: 'ok',
    reachable: true,
    access: {
      status: 'granted',
      visible: true,
      launchable: true,
      platformRole: null,
      source: 'default',
    },
    launchContext: null,
    ...partial,
  }
}

describe('shell-product-switcher', () => {
  it('maps visible launchable products to switcher items', () => {
    const items = toSwitcherItems([
      product({ id: 'plexon', name: 'PLEXON', homeUrl: '/' }),
      product({
        id: 'creation',
        name: 'CREATION',
        access: {
          status: 'granted',
          visible: true,
          launchable: true,
          platformRole: null,
          source: 'default',
        },
      }),
    ])
    expect(items).toHaveLength(2)
    expect(items.find((item) => item.id === 'creation')?.href).toBe('https://example.test/')
  })

  it('marks planned products disabled', () => {
    const items = toSwitcherItems([
      product({ id: 'videon', name: 'VIDEON', lifecycle: 'planned' }),
    ])
    expect(items[0]?.disabled).toBe(true)
  })
})
