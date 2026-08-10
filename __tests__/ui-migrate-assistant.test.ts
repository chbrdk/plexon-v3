import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

const shellFiles = [
  'app/assistant/page.tsx',
  'components/assistant/AssistantChat.tsx',
  'components/assistant/AssistantChatComposer.tsx',
  'components/assistant/AssistantMessageList.tsx',
  'components/assistant/AssistantConversationHistory.tsx',
  'components/assistant/AssistantFollowUpChips.tsx',
  'components/assistant/AssistantMessageContent.tsx',
  'components/assistant/ConfirmActionCard.tsx',
  'components/assistant/PlannerStepCard.tsx',
  'components/assistant/AgentActivityTrace.tsx',
  'components/assistant/ReportCollectionBar.tsx',
  'components/assistant/ReportBinaryDownloadButton.tsx',
  'components/assistant/ReportPdfDownloadButton.tsx',
  'components/assistant/PublicReportView.tsx',
  'components/assistant-ui/AssistantChatBubble.tsx',
]

describe('assistant ui rebuild (wave 5 shell)', () => {
  it('shell file set has no @mui or @msqdx/react', () => {
    for (const rel of shellFiles) {
      const src = readFileSync(path.join(root, rel), 'utf8')
      expect(src, rel).not.toContain("from '@msqdx/react'")
      expect(src, rel).not.toContain("from '@mui/material'")
    }
  })

  it('uses Audion/DS chat chrome classes', () => {
    const chat = readFileSync(path.join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    const composer = readFileSync(
      path.join(root, 'components/assistant/AssistantChatComposer.tsx'),
      'utf8'
    )
    const bubble = readFileSync(
      path.join(root, 'components/assistant-ui/AssistantChatBubble.tsx'),
      'utf8'
    )
    const history = readFileSync(
      path.join(root, 'components/assistant/AssistantConversationHistory.tsx'),
      'utf8'
    )
    const page = readFileSync(path.join(root, 'app/assistant/page.tsx'), 'utf8')

    expect(page).toContain("from '@msqdx/ui'")
    expect(chat).toContain('chat-panel')
    expect(chat).toContain('chat-turns')
    expect(composer).toContain('chat-form')
    expect(composer).toContain('chat-composer')
    expect(composer).toContain('chat-send')
    expect(composer).toContain('IconSend')
    expect(bubble).toContain('chat-turn')
    expect(history).toContain('Flyout')
    expect(history).toContain('IconHistory')
    expect(history).toContain('SectionChrome')
  })

  it('spec is Accepted for wave 5 shell and Wave 7 generative UI', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/ui-migrate-assistant.md'), 'utf8')
    expect(spec).toContain('Accepted')
    expect(spec).toContain('chat-panel')
    expect(spec).toContain('Flyout')
    expect(spec).toContain('Wave 7')
    expect(spec).toContain('plexon-assistant-steps')
  })
})
