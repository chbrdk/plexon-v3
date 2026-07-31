'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Chip, Panel, Spinner, Text } from '@msqdx/ui'
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

  const statusConfig = useCallback(
    (product: PlatformProductSummary): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } => {
      switch (product.runtimeStatus) {
        case 'healthy':
          return { label: t('dashboard.runtimeHealthy'), tone: 'success' }
        case 'not_configured':
          return { label: t('dashboard.runtimeNotConfigured'), tone: 'warning' }
        case 'unreachable':
          return { label: t('dashboard.runtimeUnreachable'), tone: 'danger' }
        case 'planned':
        default:
          return { label: t('dashboard.runtimePlanned'), tone: 'neutral' }
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

  return (
    <ul className="plexon-magazine-grid" data-section={dataSection}>
      {visibleProducts.map((product) => {
        const status = statusConfig(product)
        const primaryEntryPoint =
          product.entryPoints.find((entry) => entry.id === product.launchContext?.entryPointId) ??
          product.entryPoints.find((entry) => entry.id.endsWith('home') || entry.id.endsWith('admin')) ??
          product.entryPoints[0]
        const isPlanned = product.runtimeStatus === 'planned'

        return (
          <li key={product.id}>
            <Panel
              className="plexon-magazine-card"
              style={{
                opacity: isPlanned ? 0.9 : 1,
                borderStyle: isPlanned ? 'dashed' : 'solid',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ minWidth: 0 }}>
                  <Text role="title" as="h3">
                    {product.name}
                  </Text>
                  <Text role="meta">{t(product.descriptionKey)}</Text>
                </div>
                <Chip static>{status.label}</Chip>
              </div>

              {variant === 'page' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {product.capabilities.map((capability) => (
                    <Chip static key={`${product.id}-${capability}`}>
                      {capabilityLabelById[capability] ?? capability}
                    </Chip>
                  ))}
                </div>
              ) : null}

              {product.access.status === 'disabled' ? (
                <Text role="meta">{t('dashboard.accessDisabled')}</Text>
              ) : null}

              <div style={{ display: 'grid', gap: '0.5rem', marginTop: 'auto' }}>
                {primaryEntryPoint ? (
                  <Button
                    variant="primary"
                    block
                    disabled={
                      !product.access.launchable ||
                      !primaryEntryPoint.href ||
                      primaryEntryPoint.href === '#'
                    }
                    onClick={() => openHref(product, primaryEntryPoint)}
                  >
                    {t(product.primaryActionKey)}
                  </Button>
                ) : null}
                {variant === 'page' && product.entryPoints.length > 1 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {product.entryPoints.slice(1).map((entryPoint) => (
                      <Button
                        key={entryPoint.id}
                        variant="ghost"
                        disabled={
                          !product.access.launchable || !entryPoint.href || entryPoint.href === '#'
                        }
                        onClick={() => openHref(product, entryPoint)}
                      >
                        {t(entryPoint.labelKey)}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {loading && variant === 'page' ? (
                  <Text role="meta">
                    <Spinner size="sm" /> {t('common.loading')}
                  </Text>
                ) : null}
              </div>
            </Panel>
          </li>
        )
      })}
    </ul>
  )
}

export function isPromotedProduct(productId: PlatformProductId): boolean {
  return getStaticPlatformProductSummaries().some((product) => product.id === productId && product.promoted)
}

