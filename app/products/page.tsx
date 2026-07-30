'use client';

import { Box } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { ProductCatalog } from '@/components/products/ProductCatalog';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function ProductsPage() {
  const { t } = useI18n();

  return (
    <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 'var(--msqdx-spacing-lg)' }}>
        <MsqdxTypography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('products.title')}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mt: 1 }}>
          {t('products.subtitle')}
        </MsqdxTypography>
      </Box>
      <ProductCatalog variant="page" dataSection="products-page-catalog" />
    </Box>
  );
}
