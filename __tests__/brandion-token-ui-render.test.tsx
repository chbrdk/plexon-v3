/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UiColorSwatchGrid } from '@/components/assistant-ui/organisms/UiColorSwatchGrid'
import { UiFontSpecimenList } from '@/components/assistant-ui/organisms/UiFontSpecimenList'

vi.mock('@msqdx/ui', () => ({
  ChatBlockPanel: ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
  SwatchStrip: ({ swatches }: { swatches: string[] }) => (
    <div data-testid="swatch-strip">{swatches.join(',')}</div>
  ),
}))

describe('UiColorSwatchGrid', () => {
  it('renders swatches and hex rows', () => {
    render(
      <UiColorSwatchGrid
        title="Farben · Demo"
        items={[
          { label: 'primary', hex: '#b638ff', path: 'color.action.primary' },
          { label: 'yellow', hex: '#fef14d' },
        ]}
      />
    )
    expect(screen.getByTestId('ui-color-swatch-grid')).toBeTruthy()
    expect(screen.getByTestId('swatch-strip').textContent).toBe('#b638ff,#fef14d')
    expect(screen.getByText('#b638ff')).toBeTruthy()
    expect(screen.getByText('color.action.primary')).toBeTruthy()
  })
})

describe('UiFontSpecimenList', () => {
  it('applies fontFamily on specimen', () => {
    const { container } = render(
      <UiFontSpecimenList
        title="Schriften"
        items={[{ label: 'heading', family: 'Source Serif 4', weight: '600', sample: 'Ag' }]}
      />
    )
    expect(screen.getByTestId('ui-font-specimen-list')).toBeTruthy()
    const sample = container.querySelector('.plexon-ui-font-specimen-list__sample') as HTMLElement
    expect(sample.style.fontFamily).toContain('Source Serif 4')
    expect(sample.textContent).toBe('Ag')
  })
})
