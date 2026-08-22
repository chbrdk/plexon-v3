import type { ProductSwitcherItem } from '../../msqdx-ui/packages/ui/src/components/ProductSwitcherPanel'
import type { PlatformProductSummary } from '@/lib/platform-products'

export function resolveLaunchHref(product: PlatformProductSummary): string {
  const entry =
    product.entryPoints.find((point) => point.openInNewTab) ?? product.entryPoints[0]
  if (entry?.href && entry.href !== '#') return entry.href
  return product.homeUrl ?? '#'
}

export function toSwitcherItems(products: PlatformProductSummary[]): ProductSwitcherItem[] {
  return products
    .filter((product) => product.access.visible)
    .map((product) => ({
      id: product.id,
      label: product.name,
      href: resolveLaunchHref(product),
      disabled:
        product.lifecycle === 'planned' ||
        product.access.status !== 'granted' ||
        !product.access.launchable,
    }))
}
