import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

const wired: Array<[string, string]> = [
  ['UiMetricGrid.tsx', 'ChatMetricGrid'],
  ['UiKeyValueList.tsx', 'ChatKeyValueList'],
  ['UiStepList.tsx', 'ChatStepList'],
  ['UiFindingList.tsx', 'ChatBlockList'],
  ['UiRecommendationList.tsx', 'ChatBlockList'],
  ['UiLinkList.tsx', 'ChatLinkList'],
  ['UiAlertBlock.tsx', 'ChatAlertBlock'],
  ['UiDataTable.tsx', 'ChatDataTable'],
  ['UiCollapsibleBlock.tsx', 'ChatCollapsible'],
  ['UiPersonaCardBlock.tsx', 'ChatEntityGrid'],
  ['UiTargetGroupCardBlock.tsx', 'ChatEntityGrid'],
]

describe('assistant chat blocks use @msqdx/ui primitives', () => {
  it('organisms import shared chat molecules', () => {
    for (const [file, token] of wired) {
      const src = readFileSync(path.join(root, 'components/assistant-ui/organisms', file), 'utf8')
      expect(src, file).toContain(token)
      expect(src, file).toContain("from '@msqdx/ui'")
    }
  })
})
