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
})
