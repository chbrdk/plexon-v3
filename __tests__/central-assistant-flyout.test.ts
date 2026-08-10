import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')

describe('central assistant flyout specs + mounts', () => {
  it('ships domain + api specs', () => {
    const domain = readFileSync(join(root, 'specs/domain/central-assistant-flyout.md'), 'utf8')
    const api = readFileSync(join(root, 'specs/api/assistant-embed.md'), 'utf8')
    expect(domain).toContain('ChatOverlay')
    expect(domain).toContain('PATH_ASSISTANT_EMBED')
    expect(api).toContain('assistant:expand')
    expect(api).toContain('postMessage')
  })

  it('AppShell mounts PlatformAssistantHost and bypasses chrome on embed', () => {
    const shell = readFileSync(join(root, 'components/AppShell.tsx'), 'utf8')
    expect(shell).toContain('PlatformAssistantHost')
    expect(shell).toContain('PATH_ASSISTANT_EMBED')
    expect(shell).toContain('isEmbedPage')
  })

  it('embed page uses overlay presentation', () => {
    const page = readFileSync(join(root, 'app/assistant/embed/page.tsx'), 'utf8')
    expect(page).toContain("presentation=\"overlay\"")
    expect(page).toContain('assistant:auth-required')
  })

  it('AssistantChat supports presentation modes', () => {
    const chat = readFileSync(join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    expect(chat).toContain("presentation = 'expand'")
    expect(chat).toContain('chat-panel-compact')
    expect(chat).toContain('assistant:expand')
  })

  it('constants export embed helpers', () => {
    const constants = readFileSync(join(root, 'lib/constants.ts'), 'utf8')
    expect(constants).toContain('PATH_ASSISTANT_EMBED')
    expect(constants).toContain('pathAssistantEmbed')
  })
})
