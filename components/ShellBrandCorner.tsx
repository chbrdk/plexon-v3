'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProductSwitcherItem } from '../../msqdx-ui/packages/ui/src/components/ProductSwitcherPanel'
import { BrandCornerProductMenu } from '@/lib/msqdx-ui-shell'
import { useI18n } from '@/components/i18n/I18nProvider'
import { API_PLATFORM_PRODUCTS, PATH_PRODUCTS } from '@/lib/constants'
import { buildFederatedLaunchHref } from '@/lib/federation-links'
import type { PlatformProductId } from '@/lib/platform-entitlements'
import {
  getStaticPlatformProductSummaries,
  type PlatformProductSummary,
} from '@/lib/platform-products'
import { toSwitcherItems } from '@/lib/shell-product-switcher'

export function ShellBrandCorner({
  currentProductId,
  label,
}: {
  currentProductId: PlatformProductId
  label: string
}) {
  const { t } = useI18n()
  const [products, setProducts] = useState<PlatformProductSummary[]>(() =>
    getStaticPlatformProductSummaries(),
  )

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch(API_PLATFORM_PRODUCTS, { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))
        if (!active || !response.ok || !Array.isArray(data?.products)) return
        setProducts(data.products as PlatformProductSummary[])
      } catch {
        // keep static fallback
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const items = useMemo(() => toSwitcherItems(products), [products])

  const onSelectItem = useCallback(
    (item: ProductSwitcherItem) => {
      const product = products.find((entry) => entry.id === item.id)
      if (!product) return
      const href = item.href ?? '#'
      if (!href || href === '#') return
      const currentLocation = typeof window !== 'undefined' ? window.location.href : null
      const entryPoint =
        product.entryPoints.find((point) => point.openInNewTab) ?? product.entryPoints[0]
      const openInNewTab = entryPoint?.openInNewTab ?? /^https?:\/\//i.test(href)
      const federatedHref = openInNewTab
        ? buildFederatedLaunchHref(href, {
            productHomeUrl: product.homeUrl,
            returnTo: currentLocation,
            launchContext: {
              ...product.launchContext,
              entryPointId: product.launchContext?.entryPointId ?? entryPoint?.id ?? null,
            },
          })
        : href
      if (!openInNewTab && href.startsWith('/')) {
        window.location.assign(href)
        return
      }
      window.open(federatedHref, '_blank', 'noopener,noreferrer')
    },
    [products],
  )

  return (
    <BrandCornerProductMenu
      label={label}
      currentProductId={currentProductId}
      items={items}
      menuLabel={t('nav.products')}
      onSelectItem={onSelectItem}
      footer={
        <Link href={PATH_PRODUCTS}>{t('dashboard.entry.products')}</Link>
      }
    />
  )
}
