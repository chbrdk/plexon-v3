import { describe, expect, it } from 'vitest'
import {
  normalizeChatMarkdown,
  parseChatBlocks,
  parseChatInlines,
} from '@/lib/assistant/format-chat-answer'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('assistant chat answer formatting', () => {
  it('parses headings, lists, and inline marks', () => {
    const blocks = parseChatBlocks('## Lead\n\n**Bold** and *em*\n\n1. One\n2. Two\n\n- A\n- B')
    expect(blocks[0]).toMatchObject({ type: 'h', level: 2 })
    expect(blocks.some((b) => b.type === 'ol')).toBe(true)
    expect(blocks.some((b) => b.type === 'ul')).toBe(true)
    expect(parseChatInlines('see [1] and [2]').some((s) => s.type === 'cite')).toBe(true)
    expect(normalizeChatMarkdown('**Title:** body').startsWith('## Title')).toBe(true)
  })

  it('parses code, links, quotes and strips emoticons', () => {
    const blocks = parseChatBlocks(
      [
        'Use `platformProjectId` and [docs](https://example.com/x).',
        '',
        '> Keep it short',
        '',
        '```ts',
        'const x = 1',
        '```',
        '',
        'Hello :-) world 🚀 done',
      ].join('\n')
    )
    expect(blocks.some((b) => b.type === 'quote')).toBe(true)
    expect(blocks.some((b) => b.type === 'code' && 'value' in b && b.value.includes('const x'))).toBe(
      true
    )
    const para = blocks.find((b) => b.type === 'p')
    expect(para?.type).toBe('p')
    if (para?.type === 'p') {
      expect(para.inlines.some((s) => s.type === 'code' && s.value === 'platformProjectId')).toBe(true)
      expect(
        para.inlines.some((s) => s.type === 'link' && s.href === 'https://example.com/x')
      ).toBe(true)
    }
    const last = blocks[blocks.length - 1]
    expect(last?.type).toBe('p')
    if (last?.type === 'p') {
      const text = last.inlines.map((s) => (s.type === 'text' ? s.value : '')).join('')
      expect(text).not.toContain('🚀')
      expect(text).not.toContain(':-)')
      expect(text).toContain('Hello')
      expect(text).toContain('world')
    }
  })

  it('pin button has no star emoticons', () => {
    const src = readFileSync(path.join(root, 'components/assistant/ReportPinButton.tsx'), 'utf8')
    expect(src).not.toContain('★')
    expect(src).not.toContain('☆')
    expect(src).toContain('pinShort')
    expect(src).toContain('shape="rounded"')
  })

  it('block pin sits inside card grid and corner tabs are square', () => {
    const renderer = readFileSync(
      path.join(root, 'components/assistant-ui/AssistantBlockRenderer.tsx'),
      'utf8'
    )
    const css = readFileSync(path.join(root, 'styles/globals.css'), 'utf8')
    const corner = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiCornerTabSectionBlock.tsx'),
      'utf8'
    )
    expect(renderer).toContain('plexon-assistant-block-main')
    expect(css).toContain('grid-template: 1fr / 1fr')
    expect(css).toMatch(/\.plexon-assistant-corner-tab \{[\s\S]*?border-radius: 0/)
    expect(corner).toContain('stripChatEmoticons')
  })

  it('AssistantMessageContent uses DS chat-answer renderer', () => {
    const src = readFileSync(path.join(root, 'components/assistant/AssistantMessageContent.tsx'), 'utf8')
    expect(src).toContain('AssistantChatAnswer')
    expect(src).not.toContain('plexon-assistant-markdown')
  })

  it('activity + planner panels do not force light paper', () => {
    const activity = readFileSync(path.join(root, 'components/assistant/AgentActivityTrace.tsx'), 'utf8')
    const planner = readFileSync(path.join(root, 'components/assistant/PlannerStepCard.tsx'), 'utf8')
    const confirm = readFileSync(path.join(root, 'components/assistant/ConfirmActionCard.tsx'), 'utf8')
    expect(activity).not.toContain("data-msqdx-surface=\"light\"")
    expect(planner).not.toContain("data-msqdx-surface=\"light\"")
    expect(confirm).not.toContain("data-msqdx-surface=\"light\"")
    expect(activity).toContain('variant="default"')
  })

  it('planner card uses compact meta chrome', () => {
    const planner = readFileSync(path.join(root, 'components/assistant/PlannerStepCard.tsx'), 'utf8')
    const css = readFileSync(path.join(root, 'styles/globals.css'), 'utf8')
    expect(planner).toContain('plexon-assistant-planner-toggle')
    expect(planner).toContain('role="meta"')
    expect(css).toContain('.plexon-assistant-planner-toggle')
    expect(css).toMatch(/\.plexon-assistant-planner \{[\s\S]*?padding: 0\.3rem 0\.5rem/)
  })
})
