import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..')

describe('assistant stream stop + busy hint + plain streaming', () => {
  it('passes AbortSignal into complete stream and exposes Stop on composer', () => {
    const client = readFileSync(join(root, 'lib/assistant/assistant-stream-client.ts'), 'utf8')
    expect(client).toContain('signal?: AbortSignal')
    expect(client).toContain('signal,')

    const chat = readFileSync(join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    expect(chat).toContain('abortController.signal')
    expect(chat).toContain('stopStreaming')
    expect(chat).toContain('busyHintStreaming')
    expect(chat).toContain('flashBusyHint')

    const composer = readFileSync(
      join(root, 'components/assistant/AssistantChatComposer.tsx'),
      'utf8',
    )
    expect(composer).toContain('onStop')
    expect(composer).toContain("t('assistant.stop')")
    expect(composer).toContain('busyHint')
  })

  it('renders plain pre-wrap while streaming assistant answers', () => {
    const answer = readFileSync(
      join(root, 'components/assistant/AssistantChatAnswer.tsx'),
      'utf8',
    )
    expect(answer).toContain('streaming = false')
    expect(answer).toContain('chat-answer-streaming')
    expect(answer).toContain("whiteSpace: 'pre-wrap'")

    const content = readFileSync(
      join(root, 'components/assistant/AssistantMessageContent.tsx'),
      'utf8',
    )
    expect(content).toContain('streaming={streaming}')
  })
})
