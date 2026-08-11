import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('assistant chat blocks use @msqdx/ui primitives', () => {
  it('metric / kv / step organisms import shared chat molecules', () => {
    const metric = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiMetricGrid.tsx'),
      'utf8',
    )
    const kv = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiKeyValueList.tsx'),
      'utf8',
    )
    const steps = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiStepList.tsx'),
      'utf8',
    )

    expect(metric).toContain('ChatMetricGrid')
    expect(metric).not.toContain('UiMetricTile')
    expect(kv).toContain('ChatKeyValueList')
    expect(kv).not.toContain('UiKeyValueRow')
    expect(steps).toContain('ChatStepList')
    expect(steps).not.toContain('plexon-assistant-steps')
  })
})
