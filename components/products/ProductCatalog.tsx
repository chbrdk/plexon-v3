'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { MsqdxButton, MsqdxCard, MsqdxTypography } from '@msqdx/react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n/I18nProvider';
import { API_PLATFORM_PRODUCTS } from '@/lib/constants';
import { buildFederatedLaunchHref } from '@/lib/federation-links';
import type { PlatformProductId } from '@/lib/platform-entitlements';
import {
  getStaticPlatformProductSummaries,
  type PlatformProductEntryPoint,
  type PlatformProductSummary,
} from '@/lib/platform-products';

type ProductCatalogVariant = 'dashboard' | 'page';

export function ProductCatalog({
  variant = 'dashboard',
  dataSection = 'product-catalog',
}: {
  variant?: ProductCatalogVariant;
  dataSection?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [products, setProducts] = useState<PlatformProductSummary[]>(() => getStaticPlatformProductSummaries());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(API_PLATFORM_PRODUCTS, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!active || !response.ok || !Array.isArray(data?.products)) return;
        setProducts(data.products as PlatformProductSummary[]);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const base = products.filter((product) => product.id !== 'plexon' && product.access.visible);
    if (variant === 'dashboard') return base.filter((product) => product.promoted);
    return base;
  }, [products, variant]);

  const openHref = useCallback(
    (product: PlatformProductSummary, entryPoint: PlatformProductEntryPoint) => {
      const href = entryPoint.href;
      const openInNewTab = entryPoint.openInNewTab;
      if (!href || href === '#') return;
      const currentLocation = typeof window !== 'undefined' ? window.location.href : null;
      const federatedHref =
        openInNewTab
          ? buildFederatedLaunchHref(href, {
              productHomeUrl: product.homeUrl,
              returnTo: currentLocation,
              launchContext: {
                ...product.launchContext,
                entryPointId: product.launchContext?.entryPointId ?? entryPoint.id,
              },
            })
          : href;
      if (!openInNewTab && href.startsWith('/')) {
        router.push(href);
        return;
      }
      window.open(federatedHref, '_blank', 'noopener,noreferrer');
    },
    [router]
  );

  const statusConfig = useCallback(
    (product: PlatformProductSummary): { label: string; background: string; color: string } => {
      switch (product.runtimeStatus) {
        case 'healthy':
          return {
            label: t('dashboard.runtimeHealthy'),
            background: 'var(--color-secondary-dx-green-tint, rgba(16, 185, 129, 0.15))',
            color: 'var(--color-text-on-light)',
          };
        case 'not_configured':
          return {
            label: t('dashboard.runtimeNotConfigured'),
            background: 'var(--color-secondary-dx-yellow-tint, rgba(245, 158, 11, 0.15))',
            color: 'var(--color-text-on-light)',
          };
        case 'unreachable':
          return {
            label: t('dashboard.runtimeUnreachable'),
            background: 'var(--color-secondary-dx-red-tint, rgba(239, 68, 68, 0.12))',
            color: 'var(--color-text-on-light)',
          };
        case 'planned':
        default:
          return {
            label: t('dashboard.runtimePlanned'),
            background: 'var(--color-bg-subtle)',
            color: 'var(--color-text-secondary)',
          };
      }
    },
    [t]
  );

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
    [t]
  );

  return (
    <Box
      data-section={dataSection}
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: variant === 'dashboard' ? 'repeat(2, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
        },
      }}
    >
      {visibleProducts.map((product) => {
        const status = statusConfig(product);
        const primaryEntryPoint =
          product.entryPoints.find((entry) => entry.id === product.launchContext?.entryPointId) ??
          product.entryPoints.find((entry) => entry.id.endsWith('home') || entry.id.endsWith('admin')) ??
          product.entryPoints[0];
        const isPlanned = product.runtimeStatus === 'planned';
        return (
          <MsqdxCard
            key={product.id}
            variant="flat"
            borderRadius="button"
            sx={{
              p: 'var(--msqdx-spacing-md)',
              height: '100%',
              minWidth: 0,
              border:
                product.runtimeStatus === 'planned'
                  ? '1px dashed var(--color-secondary-dx-grey-light-tint)'
                  : '1px solid var(--color-secondary-dx-grey-light-tint)',
              bgcolor: product.runtimeStatus === 'planned' ? 'var(--color-bg-subtle)' : 'var(--color-card-bg)',
              color: 'var(--color-text-on-light)',
              display: 'flex',
              flexDirection: 'column',
              opacity: isPlanned ? 0.9 : 1,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box sx={{ minWidth: 0 }}>
                <MsqdxTypography variant="subtitle1" weight="semibold">
                  {product.name}
                </MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.5 }}>
                  {t(product.descriptionKey)}
                </MsqdxTypography>
              </Box>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: '999px',
                  bgcolor: status.background,
                  color: status.color,
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {status.label}
              </Box>
            </Stack>

            {variant === 'page' && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mb: 2 }}>
                {product.capabilities.map((capability) => (
                  <Box
                    key={`${product.id}-${capability}`}
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: '999px',
                      bgcolor: 'var(--color-bg-subtle)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                    }}
                  >
                    {capabilityLabelById[capability] ?? capability}
                  </Box>
                ))}
              </Stack>
            )}

            {product.access.status === 'disabled' && (
              <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
                {t('dashboard.accessDisabled')}
              </MsqdxTypography>
            )}

            <Stack spacing={1} sx={{ mt: 'auto' }}>
              {primaryEntryPoint && (
                <MsqdxButton
                  variant="contained"
                  fullWidth
                  disabled={!product.access.launchable || !primaryEntryPoint.href || primaryEntryPoint.href === '#'}
                  onClick={() => openHref(product, primaryEntryPoint)}
                >
                  {t(product.primaryActionKey)}
                </MsqdxButton>
              )}
              {variant === 'page' && product.entryPoints.length > 1 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  {product.entryPoints.slice(1).map((entryPoint) => (
                    <MsqdxButton
                      key={entryPoint.id}
                      variant="outlined"
                      disabled={!product.access.launchable || !entryPoint.href || entryPoint.href === '#'}
                      onClick={() => openHref(product, entryPoint)}
                    >
                      {t(entryPoint.labelKey)}
                    </MsqdxButton>
                  ))}
                </Stack>
              )}
              {loading && variant === 'page' && (
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  {t('common.loading')}
                </MsqdxTypography>
              )}
            </Stack>
          </MsqdxCard>
        );
      })}
    </Box>
  );
}

export function isPromotedProduct(productId: PlatformProductId): boolean {
  return getStaticPlatformProductSummaries().some((product) => product.id === productId && product.promoted);
}
