'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { API_PLATFORM_PRODUCTS } from '@/lib/constants'
import { buildFederatedLaunchHref } from '@/lib/federation-links'
import type { PlatformProductId } from '@/lib/platform-entitlements'
import {
  getStaticPlatformProductSummaries,
  type PlatformProductEntryPoint,
  type PlatformProductSummary,
} from '@/lib/platform-products'

type ProductCatalogVariant = 'dashboard' | 'page'

const CAPABILITY_PREVIEW = 3

export function ProductCatalog({
  variant = 'dashboard',
  dataSection = 'product-catalog',
}: {
  variant?: ProductCatalogVariant
  dataSection?: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [products, setProducts] = useState<PlatformProductSummary[]>(() => getStaticPlatformProductSummaries())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const response = await fetch(API_PLATFORM_PRODUCTS, { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))
        if (!active || !response.ok || !Array.isArray(data?.products)) return
        setProducts(data.products as PlatformProductSummary[])
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const visibleProducts = useMemo(() => {
    const base = products.filter((product) => product.id !== 'plexon' && product.access.visible)
    if (variant === 'dashboard') return base.filter((product) => product.promoted)
    return base
  }, [products, variant])

  const openHref = useCallback(
    (product: PlatformProductSummary, entryPoint: PlatformProductEntryPoint) => {
      const href = entryPoint.href
      const openInNewTab = entryPoint.openInNewTab
      if (!href || href === '#') return
      const currentLocation = typeof window !== 'undefined' ? window.location.href : null
      const federatedHref = openInNewTab
        ? buildFederatedLaunchHref(href, {
            productHomeUrl: product.homeUrl,
            returnTo: currentLocation,
            launchContext: {
              ...product.launchContext,
              entryPointId: product.launchContext?.entryPointId ?? entryPoint.id,
            },
          })
        : href
      if (!openInNewTab && href.startsWith('/')) {
        router.push(href)
        return
      }
      window.open(federatedHref, '_blank', 'noopener,noreferrer')
    },
    [router],
  )

  const statusLabel = useCallback(
    (product: PlatformProductSummary): string => {
      switch (product.runtimeStatus) {
        case 'healthy':
          return t('dashboard.runtimeHealthy')
        case 'not_configured':
          return t('dashboard.runtimeNotConfigured')
        case 'unreachable':
          return t('dashboard.runtimeUnreachable')
        case 'planned':
        default:
          return t('dashboard.runtimePlanned')
      }
    },
    [t],
  )

  const capabilityLabelById = useMemo<Record<string, string>>(
    () => ({
      'dashboard.capabilityIdentity': t('dashboard.capabilityIdentity'),
      'dashboard.capabilityProfile': t('dashboard.capabilityProfile'),
      'dashboard.capabilityUsage': t('dashboard.capabilityUsage'),
      'dashboard.capabilityRegistry': t('dashboard.capabilityRegistry'),
      'dashboard.capabilityCentralIdentity': t('dashboard.capabilityCentralIdentity'),
      'dashboard.capabilityProfileSync': t('dashboard.capabilityProfileSync'),
      'dashboard.capabilityMcp': t('dashboard.capabilityMcp'),
      'dashboard.capabilityProjectScoped': t('dashboard.capabilityProjectScoped'),
      'dashboard.capabilityFutureRegistry': t('dashboard.capabilityFutureRegistry'),
    }),
    [t],
  )

  const surfaceKicker = useCallback(
    (product: PlatformProductSummary): string =>
      product.surface === 'federated'
        ? t('dashboard.productSurfaceFederated')
        : t('dashboard.productSurfaceNative'),
    [t],
  )

  return (
    <div className="plexon-collection-list" data-section={dataSection}>
      <div className="plexon-collection-grid">
        {visibleProducts.map((product) => {
          const status = statusLabel(product)
          const primaryEntryPoint =
            product.entryPoints.find((entry) => entry.id === product.launchContext?.entryPointId) ??
            product.entryPoints.find((entry) => entry.id.endsWith('home') || entry.id.endsWith('admin')) ??
            product.entryPoints[0]
          const isPlanned = product.runtimeStatus === 'planned'
          const capabilityKeys =
            variant === 'page' ? product.capabilities : product.capabilities.slice(0, CAPABILITY_PREVIEW)
          const secondaryEntryPoints =
            variant === 'page' ? product.entryPoints.filter((entry) => entry.id !== primaryEntryPoint?.id) : []
          const launchDisabled =
            !product.access.launchable || !primaryEntryPoint?.href || primaryEntryPoint.href === '#'

          return (
            <article
              key={product.id}
              className="plexon-collection-card"
              data-planned={isPlanned ? 'true' : undefined}
            >
              <header className="plexon-collection-card-head">
                <Text role="meta" as="p" className="plexon-collection-card-kicker">
                  {surfaceKicker(product)}
                </Text>
                <span className="plexon-collection-card-badge">{status}</span>
              </header>

              <Text role="headline" as="h3" className="plexon-collection-card-title">
                {product.name}
              </Text>

              <Text role="meta" as="p" className="plexon-collection-card-hint">
                {t(product.descriptionKey)}
              </Text>

              {product.access.status === 'disabled' ? (
                <Text role="meta" as="p" className="plexon-collection-card-hint">
                  {t('dashboard.accessDisabled')}
                </Text>
              ) : null}

              {capabilityKeys.length > 0 ? (
                <div className="plexon-collection-card-stats" aria-label={t('dashboard.productsTitle')}>
                  {capabilityKeys.map((capability) => (
                    <div
                      key={`${product.id}-${capability}`}
                      className="plexon-collection-metric plexon-product-capability"
                      data-linked="true"
                    >
                      <span className="plexon-collection-metric-label">
                        {capabilityLabelById[capability] ?? capability}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="plexon-collection-card-actions">
                {primaryEntryPoint ? (
                  <span className="plexon-collection-card-link">
                    <Button
                      variant="ghost"
                      size="md"
                      disabled={launchDisabled}
                      onClick={() => openHref(product, primaryEntryPoint)}
                    >
                      {t(product.primaryActionKey)}
                    </Button>
                  </span>
                ) : null}
                {secondaryEntryPoints.map((entryPoint) => (
                  <span key={entryPoint.id} className="plexon-collection-card-link">
                    <Button
                      variant="ghost"
                      size="md"
                      disabled={!product.access.launchable || !entryPoint.href || entryPoint.href === '#'}
                      onClick={() => openHref(product, entryPoint)}
                    >
                      {t(entryPoint.labelKey)}
                    </Button>
                  </span>
                ))}
              </div>
            </article>
          )
        })}
      </div>
      {loading && variant === 'page' ? (
        <Text role="meta" as="p" className="plexon-collection-list-status">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}
    </div>
  )
}

export function isPromotedProduct(productId: PlatformProductId): boolean {
  return getStaticPlatformProductSummaries().some((product) => product.id === productId && product.promoted)
}
