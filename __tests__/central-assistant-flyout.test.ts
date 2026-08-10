import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')

describe('central assistant flyout specs + mounts', () => {
  it('ships domain + api specs', () => {
    const domain = readFileSync(join(root, 'specs/domain/central-assistant-flyout.md'), 'utf8')
    const api = readFileSync(join(root, 'specs/api/assistant-embed.md'), 'utf8')
    expect(domain).toContain('ChatOverlay')
    expect(domain).toContain('Hybrid')
    expect(domain).toContain('drag-resizable')
    expect(domain).toContain('PATH_ASSISTANT_EMBED')
    expect(api).toContain('assistant:expand')
    expect(api).toContain('assistant:theme')
    expect(api).toContain('postMessage')
  })

  it('AppShell mounts PlatformAssistantHost and bypasses chrome on embed', () => {
    const shell = readFileSync(join(root, 'components/AppShell.tsx'), 'utf8')
    expect(shell).toContain('PlatformAssistantHost')
    expect(shell).toContain('PATH_ASSISTANT_EMBED')
    expect(shell).toContain('isEmbedPage')
  })

  it('host uses native AssistantChat same-origin and iframe cross-origin', () => {
    const host = readFileSync(join(root, 'components/PlatformAssistantHost.tsx'), 'utf8')
    expect(host).toContain('useSameOriginNative')
    expect(host).toContain('<AssistantChat')
    expect(host).toContain('presentation="overlay"')
    expect(host).toContain('plexon-assistant-embed-frame')
    expect(host).toContain('assistant:theme')
    expect(host).toContain('headerActions')
  })

  it('embed page uses overlay presentation and theme sync', () => {
    const page = readFileSync(join(root, 'app/assistant/embed/page.tsx'), 'utf8')
    expect(page).toContain("presentation=\"overlay\"")
    expect(page).toContain('assistant:auth-required')
    expect(page).toContain('EmbedThemeSync')
    expect(page).toContain('applyAssistantEmbedTheme')
  })

  it('AssistantChat supports presentation modes and conversation callback', () => {
    const chat = readFileSync(join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    expect(chat).toContain("presentation = 'expand'")
    expect(chat).toContain('chat-panel-compact')
    expect(chat).toContain('onConversationChange')
    expect(chat).toContain('plexon-assistant-topbar-overlay')
  })

  it('overlay flyout uses theme ink instead of forced light paper', () => {
    const css = readFileSync(join(root, 'styles/globals.css'), 'utf8')
    expect(css).toContain("[data-plexon-assistant-chat][data-presentation='overlay']")
    expect(css).toMatch(
      /\[data-plexon-assistant-chat\]\s*\{\s*background-color:\s*transparent;\s*color:\s*var\(--ink\);/s,
    )
    expect(css).toContain("[data-presentation='overlay'] .plexon-assistant-suggestions")
  })

  it('overlay composer is compact without Message label', () => {
    const composer = readFileSync(join(root, 'components/assistant/AssistantChatComposer.tsx'), 'utf8')
    const chat = readFileSync(join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    expect(composer).toContain('compact = false')
    expect(composer).not.toContain('label="Message"')
    expect(chat).toContain('compact={presentation === \'overlay\'}')
  })

  it('overlay chat does not navigate to expand URL', () => {
    const chat = readFileSync(join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    expect(chat).toContain('syncConversationToUrl')
    expect(chat).toContain("if (presentation === 'overlay') return")
  })
})
