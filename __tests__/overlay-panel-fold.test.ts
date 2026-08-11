import { describe, expect, it } from 'vitest'
import {
  mergeUiLayoutBlocksWithPanel,
  messageUiBlocksForSurface,
} from '@/lib/assistant/ui-blocks/parse-metadata'
import type { UiLayout } from '@/lib/assistant/ui-blocks/types'
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types'

describe('overlay panel fold', () => {
  const layout: UiLayout = {
    version: UI_LAYOUT_VERSION,
    blocks: [{ id: 'a', type: 'alert', props: { message: 'hi', tone: 'info' } }],
    panel: {
      open: true,
      title: 'Personas',
      blocks: [
        {
          id: 'p1',
          type: 'persona_card',
          props: {
            personas: [
              {
                id: '1',
                name: 'Markus',
                segment: 'Sport',
                confidence: 0.9,
                headline: 'Performance',
              },
            ],
          },
        },
      ],
    },
  }

  it('mergeUiLayoutBlocksWithPanel appends open panel blocks', () => {
    const merged = mergeUiLayoutBlocksWithPanel(layout)
    expect(merged.map((b) => b.id)).toEqual(['a', 'p1'])
  })

  it('messageUiBlocksForSurface folds panel only in overlay', () => {
    const meta = { uiLayout: layout }
    expect(messageUiBlocksForSurface(meta, 'expand').map((b) => b.id)).toEqual(['a'])
    expect(messageUiBlocksForSurface(meta, 'overlay').map((b) => b.id)).toEqual(['a', 'p1'])
  })
})
