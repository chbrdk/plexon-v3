/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createUiBlock, parseUiBlockProps } from '@/lib/assistant/ui-blocks/validate'
import { blockToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text'
import { buildUiToolsPromptBlock, buildUiPanelHintForPlan } from '@/lib/assistant/ui-tools/catalog-for-prompt'

vi.mock('@msqdx/ui', () => ({
  ChatBlockPanel: ({
    title,
    children,
  }: {
    title?: string
    children?: React.ReactNode
  }) => (
    <section data-testid="finding-panel">
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  ),
  Chip: ({ children }: { children?: React.ReactNode }) => <span data-testid="chip">{children}</span>,
  SwatchStrip: ({ swatches }: { swatches: string[] }) => (
    <span data-testid="swatch-strip">{swatches.join(',')}</span>
  ),
  Text: ({ children, as: As = 'span', ...rest }: { children?: React.ReactNode; as?: string }) => {
    const Tag = As as 'span'
    return <Tag {...rest}>{children}</Tag>
  },
}))

import { UiFindingList } from '@/components/assistant-ui/organisms/UiFindingList'

describe('finding_list color swatches', () => {
  it('accepts hex and swatches on finding items', () => {
    const parsed = parseUiBlockProps('finding_list', {
      title: 'Persona × Farbe',
      items: [
        {
          title: 'Performance-Sportler',
          description: 'Hoher Kontrast, datengetrieben',
          severity: 'success',
          hex: '#0A0A0A',
          swatches: ['#0A0A0A', '#FF3B00'],
        },
      ],
    })
    expect(parsed.ok).toBe(true)
  })

  it('rejects invalid finding hex', () => {
    const parsed = parseUiBlockProps('finding_list', {
      items: [{ title: 'A', description: 'B', hex: 'black' }],
    })
    expect(parsed.ok).toBe(false)
  })

  it('renders hero swatch + strip for multi-color findings', () => {
    render(
      <UiFindingList
        title="Zentrale Findings"
        items={[
          {
            title: 'Urban Commuter',
            description: 'Smart, stylisch – Akzentfarbe trägt',
            severity: 'info',
            swatches: ['#1A1A2E', '#E94560'],
          },
        ]}
      />
    )
    expect(screen.getByTestId('ui-finding-list')).toBeTruthy()
    expect(screen.getByTitle('#1A1A2E')).toBeTruthy()
    expect(screen.getByTestId('swatch-strip').textContent).toBe('#E94560')
    expect(screen.getByText(/#1A1A2E · #E94560/)).toBeTruthy()
  })

  it('includes hex in plain text fallback', () => {
    const created = createUiBlock(
      'finding_list',
      {
        items: [{ title: 'Fit', description: 'Passt', hex: '#B638FF' }],
      },
      'f1'
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(blockToPlainText(created.block)).toContain('#B638FF')
  })

  it('steers brand color analysis away from data_table in prompts', () => {
    const catalog = buildUiToolsPromptBlock()
    expect(catalog).toContain('finding_list')
    expect(catalog).toMatch(/nie `data_table`/)
    expect(catalog).toContain('hex')
    expect(buildUiPanelHintForPlan('brandion_brand')).toContain('finding_list')
    expect(buildUiPanelHintForPlan('brandion_brand')).toContain('kein `data_table`')
  })
})
