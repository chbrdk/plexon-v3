'use client'

import { useEffect, useState } from 'react'
import {
  AccentSwatchGroup,
  applyAccentPreference,
  migrateLegacyAccent,
  type AccentPreference,
} from '@msqdx/ui'
import { BRAND_COLOR_STORAGE_KEY, persistAccentPreference } from '@/lib/brand-color-utils'
import { useI18n } from '@/components/i18n/I18nProvider'

/** Legacy auth/settings wrapper — prefer AccentSwatchGroup in Appearance. */
export function BrandColorSelector() {
  const { t } = useI18n()
  const [selected, setSelected] = useState<AccentPreference>('green')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem(BRAND_COLOR_STORAGE_KEY) : null
    const next = migrateLegacyAccent(saved)
    setSelected(next)
    applyAccentPreference(next)
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <AccentSwatchGroup
      value={selected}
      onChange={(next) => {
        setSelected(next)
        persistAccentPreference(next)
        applyAccentPreference(next)
      }}
      aria-label={t('settings.appearance.title')}
    />
  )
}
