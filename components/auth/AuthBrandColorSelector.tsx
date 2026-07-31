'use client'

import { useEffect, useState } from 'react'
import { applyBrandColorVars } from '@/lib/brand-color-utils'

const BRAND_COLORS = [
  { id: 'purple', varName: '--color-secondary-dx-purple', hex: '#b638ff' },
  { id: 'yellow', varName: '--color-secondary-dx-yellow', hex: '#fef14d' },
  { id: 'pink', varName: '--color-secondary-dx-pink', hex: '#f256b6' },
  { id: 'orange', varName: '--color-secondary-dx-orange', hex: '#ff6a3b' },
  { id: 'green', varName: '--color-secondary-dx-green', hex: '#00ca55' },
] as const

const STORAGE_KEY = 'plexon-sidebar-color'
const DEFAULT_COLOR = '--color-secondary-dx-green'

export function AuthBrandColorSelector() {
  const [selected, setSelected] = useState<string>(DEFAULT_COLOR)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_COLOR
    setSelected(saved)
    applyBrandColorVars(saved, 'light')
    setMounted(true)
  }, [])

  const handleSelect = (varName: string) => {
    setSelected(varName)
    localStorage.setItem(STORAGE_KEY, varName)
    applyBrandColorVars(varName, 'light')
  }

  if (!mounted) return null

  return (
    <div className="plexon-auth-brand-row" role="group" aria-label="Brand color">
      {BRAND_COLORS.map(({ id, varName, hex }) => {
        const isSelected = selected === varName
        return (
          <button
            key={id}
            type="button"
            onClick={() => handleSelect(varName)}
            aria-label={`Farbe ${id} wählen`}
            aria-pressed={isSelected}
            className="plexon-auth-brand-swatch"
            style={{
              backgroundColor: hex,
              outline: isSelected ? '2px solid var(--fg)' : '1px solid color-mix(in srgb, var(--fg) 40%, transparent)',
            }}
          />
        )
      })}
    </div>
  )
}
