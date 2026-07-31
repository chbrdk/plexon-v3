'use client'

import { useEffect, useState } from 'react'
import {
  BRAND_COLOR_DEFAULT,
  BRAND_COLOR_STORAGE_KEY,
  applyBrandColorVars,
} from '@/lib/brand-color-utils'
import { useI18n } from '@/components/i18n/I18nProvider'

const OPTIONS = [
  { varName: '--color-secondary-dx-purple', preview: '#b638ff', labelKey: 'purple' },
  { varName: '--color-secondary-dx-blue', preview: '#3b82f6', labelKey: 'blue' },
  { varName: '--color-secondary-dx-pink', preview: '#f256b6', labelKey: 'pink' },
  { varName: '--color-secondary-dx-orange', preview: '#ff6a3b', labelKey: 'orange' },
  { varName: '--color-secondary-dx-green', preview: '#00ca55', labelKey: 'green' },
  { varName: '--color-secondary-dx-yellow', preview: '#fef14d', labelKey: 'yellow' },
  { varName: '--color-secondary-dx-grey-light', preview: '#d4d2d2', labelKey: 'grey' },
  { varName: '--audion-light-border-color', preview: '#0f172a', labelKey: 'default' },
] as const

const LABELS: Record<(typeof OPTIONS)[number]['labelKey'], { de: string; en: string }> = {
  purple: { de: 'Lila', en: 'Purple' },
  blue: { de: 'Blau', en: 'Blue' },
  pink: { de: 'Pink', en: 'Pink' },
  orange: { de: 'Orange', en: 'Orange' },
  green: { de: 'Grün', en: 'Green' },
  yellow: { de: 'Gelb', en: 'Yellow' },
  grey: { de: 'Grau', en: 'Grey' },
  default: { de: 'Standard', en: 'Default' },
}

export function BrandColorSelector() {
  const { t, locale } = useI18n()
  const [selectedColor, setSelectedColor] = useState('')
  const [mounted, setMounted] = useState(false)
  const lang = locale === 'en' ? 'en' : 'de'

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(BRAND_COLOR_STORAGE_KEY) : null
    const colorVar = saved ?? BRAND_COLOR_DEFAULT
    setSelectedColor(colorVar)
    applyBrandColorVars(colorVar, 'dark')
    setMounted(true)
  }, [])

  const handleColorSelect = (varName: string) => {
    setSelectedColor(varName)
    if (typeof window !== 'undefined') localStorage.setItem(BRAND_COLOR_STORAGE_KEY, varName)
    applyBrandColorVars(varName, 'dark')
  }

  if (!mounted) return null

  return (
    <div className="plexon-brand-swatches" role="group" aria-label={t('settings.appearance.title')}>
      {OPTIONS.map((option) => {
        const isSelected = selectedColor === option.varName
        const label = LABELS[option.labelKey][lang]
        return (
          <button
            key={option.varName}
            type="button"
            aria-label={t('settings.appearance.colorSelectAria', { label })}
            aria-pressed={isSelected}
            className="plexon-brand-swatch"
            data-selected={isSelected ? 'true' : undefined}
            onClick={() => handleColorSelect(option.varName)}
            style={{ backgroundColor: option.preview }}
          >
            <span className="plexon-brand-swatch__label">{label}</span>
            <span className="plexon-brand-swatch__hex">{option.preview}</span>
          </button>
        )
      })}
    </div>
  )
}
