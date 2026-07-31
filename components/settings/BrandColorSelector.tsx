'use client'

import { useEffect, useState } from 'react'
import {
  BRAND_COLOR_DEFAULT,
  BRAND_COLOR_OPTIONS,
  BRAND_COLOR_STORAGE_KEY,
  applyBrandColorVars,
} from '@/lib/brand-color-utils'
import { useI18n } from '@/components/i18n/I18nProvider'

const LABELS: Record<string, { de: string; en: string }> = {
  '--color-secondary-dx-purple': { de: 'Lila', en: 'Purple' },
  '--color-secondary-dx-blue': { de: 'Blau', en: 'Blue' },
  '--color-secondary-dx-pink': { de: 'Pink', en: 'Pink' },
  '--color-secondary-dx-orange': { de: 'Orange', en: 'Orange' },
  '--color-secondary-dx-green': { de: 'Grün', en: 'Green' },
  '--color-secondary-dx-yellow': { de: 'Gelb', en: 'Yellow' },
  '--color-secondary-dx-grey-light': { de: 'Grau', en: 'Grey' },
  '--audion-light-border-color': { de: 'Standard', en: 'Default' },
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
      {BRAND_COLOR_OPTIONS.map((option) => {
        const isSelected = selectedColor === option.varName
        const label = LABELS[option.varName]?.[lang] ?? option.varName
        return (
          <button
            key={option.varName}
            type="button"
            aria-label={t('settings.appearance.colorSelectAria', { label })}
            aria-pressed={isSelected}
            className="plexon-brand-swatch"
            data-selected={isSelected ? 'true' : undefined}
            onClick={() => handleColorSelect(option.varName)}
            style={{
              backgroundColor: option.preview,
              color: option.textColor,
            }}
          >
            <span className="plexon-brand-swatch__label">{label}</span>
            <span className="plexon-brand-swatch__hex">{option.preview}</span>
          </button>
        )
      })}
    </div>
  )
}
