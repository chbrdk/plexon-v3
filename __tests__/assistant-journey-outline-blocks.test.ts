import { describe, expect, it } from 'vitest'
import {
  buildJourneyDetailLayout,
  buildJourneyOutlineBlocks,
} from '@/lib/assistant/ui-blocks/build-journey-outline-ui'
import { isUiBlockType, parseUiBlockProps } from '@/lib/assistant/ui-blocks/validate'

describe('journey outline chat blocks', () => {
  it('registers phase_strip, moment_list, and quote_list block types', () => {
    expect(isUiBlockType('phase_strip')).toBe(true)
    expect(isUiBlockType('moment_list')).toBe(true)
    expect(isUiBlockType('quote_list')).toBe(true)
  })

  it('builds phase + embedded moments for interactive outline', () => {
    const blocks = buildJourneyOutlineBlocks({
      title: 'Checkout Journey',
      activePhaseId: 'ph2',
      phases: [
        { id: 'ph1', name: 'Awareness', summary: 'Touch', order: 1, elements: [{ kind: 'action', label: 'See ad' }] },
        {
          id: 'ph2',
          name: 'Consideration',
          summary: 'Compare',
          order: 2,
          elements: [
            { id: 'm1', kind: 'pain', label: 'Too many fields' },
            { kind: 'opportunity', label: 'Add FAQ' },
          ],
        },
        { id: 'ph3', name: 'Decision', order: 3 },
      ],
    })

    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('phase_strip')

    const phases = parseUiBlockProps('phase_strip', blocks[0].props)
    expect(phases.ok).toBe(true)
    if (phases.ok) {
      const list = phases.props.phases as Array<{
        id: string
        active?: boolean
        status?: string
        moments?: Array<{ kind: string; label: string }>
      }>
      expect(list.find((p) => p.id === 'ph2')?.active).toBe(true)
      expect(list.find((p) => p.id === 'ph1')?.status).toBe('done')
      expect(list.find((p) => p.id === 'ph2')?.moments?.[0].label).toBe('Too many fields')
      expect(list.find((p) => p.id === 'ph1')?.moments?.[0].kind).toBe('action')
    }
  })

  it('can force standalone moment_list for showcase', () => {
    const blocks = buildJourneyOutlineBlocks({
      title: 'Checkout Journey',
      interactive: false,
      phases: [
        {
          id: 'ph2',
          name: 'Consideration',
          order: 2,
          elements: [{ id: 'm1', kind: 'pain', label: 'Too many fields' }],
        },
      ],
    })
    expect(blocks.map((b) => b.type)).toEqual(['phase_strip', 'moment_list'])
  })

  it('builds full journey detail layout with validate quotes', () => {
    const layout = buildJourneyDetailLayout({
      journeyId: 'j1',
      journeyName: 'Checkout',
      journeyHref: 'https://audion-v3.example/journeys/j1',
      activePhaseId: 'ph2',
      phases: [
        {
          id: 'ph2',
          name: 'Consideration',
          order: 2,
          elements: [{ kind: 'pain', label: 'Too many fields' }],
        },
      ],
      quotes: [
        {
          quote: 'Need citations',
          attribution: 'Alex · Consideration',
          tone: 'warning',
        },
      ],
      findings: [
        {
          title: 'Missing sources',
          description: 'Compare page lacks citations',
          severity: 'warning',
        },
      ],
      recommendations: [{ title: 'Add FAQ', priority: 1, category: 'Content' }],
    })

    const types = layout.blocks.map((b) => b.type)
    expect(types).toContain('phase_strip')
    expect(types).not.toContain('moment_list')
    expect(types).toContain('quote_list')
    expect(types).toContain('finding_list')
    expect(types).toContain('recommendation_list')
    expect(types).toContain('link_list')

    const strip = layout.blocks.find((b) => b.type === 'phase_strip')
    const parsed = parseUiBlockProps('phase_strip', strip!.props)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      const phases = parsed.props.phases as Array<{ moments?: unknown[] }>
      expect(phases[0].moments).toHaveLength(1)
    }
  })

  it('Ui wrappers import DS chat primitives', async () => {
    const { readFileSync } = await import('node:fs')
    const path = await import('node:path')
    const root = path.resolve(__dirname, '..')
    const phase = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiPhaseStrip.tsx'),
      'utf8',
    )
    const moments = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiMomentList.tsx'),
      'utf8',
    )
    const quotes = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiQuoteList.tsx'),
      'utf8',
    )
    expect(phase).toContain('ChatPhaseStrip')
    expect(moments).toContain('ChatMomentList')
    expect(quotes).toContain('ChatQuoteList')
  })
})
