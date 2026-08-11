import { describe, expect, it } from 'vitest'
import { resolveUiTextTypography } from '@/components/assistant-ui/atoms/UiText'

describe('resolveUiTextTypography', () => {
  it('maps subtitle2 to compact title headlines', () => {
    expect(resolveUiTextTypography('subtitle2')).toEqual({
      role: 'title',
      size: 'lg',
      as: 'p',
    })
  })

  it('maps body2 to meta prose (not full body)', () => {
    expect(resolveUiTextTypography('body2')).toEqual({
      role: 'meta',
      as: 'p',
    })
  })

  it('maps caption to hint', () => {
    expect(resolveUiTextTypography('caption')).toEqual({
      role: 'hint',
      as: 'span',
    })
  })
})
