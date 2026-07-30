'use client';

import { useEffect } from 'react';
import { initBrandColorFromStorage } from '@/lib/brand-color-utils';

export function BrandColorInitializer() {
  useEffect(() => {
    initBrandColorFromStorage('dark');
  }, []);
  return null;
}
