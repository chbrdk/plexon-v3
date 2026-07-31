'use client'

import { SectionChrome, Text } from '@msqdx/ui'
import { ProductCatalog } from '@/components/products/ProductCatalog'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function ProductsPage() {
  const { t } = useI18n()

  return (
    <div className="plexon-magazine">
      <SectionChrome
        title={t('products.title')}
        meta={<Text role="meta">{t('products.subtitle')}</Text>}
      />
      <ProductCatalog variant="page" dataSection="products-page-catalog" />
    </div>
  )
}
