import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

function collectTsx(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectTsx(full))
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

const wave7Files = [
  ...collectTsx(path.join(root, 'components/assistant-ui')),
  path.join(root, 'components/assistant/ReportPinButton.tsx'),
  path.join(root, 'components/assistant/AssistantCapabilitiesOverview.tsx'),
  path.join(root, 'components/assistant/AgentPhaseIndicator.tsx'),
  path.join(root, 'components/assistant/AssistantChatAnswer.tsx'),
].map((abs) => path.relative(root, abs))

describe('assistant ui rebuild (wave 7 generative UI)', () => {
  it('wave 7 file set has no @mui, @msqdx/react, alpha, or light-surface force', () => {
    for (const rel of wave7Files) {
      const src = readFileSync(path.join(root, rel), 'utf8')
      expect(src, rel).not.toContain("from '@msqdx/react'")
      expect(src, rel).not.toContain("from '@mui/material'")
      expect(src, rel).not.toContain("from '@mui/")
      expect(src, rel).not.toContain('data-msqdx-surface="light"')
      expect(src, rel).not.toContain("data-msqdx-surface='light'")
      // avoid MUI alpha() helper in these surfaces
      expect(src, rel).not.toMatch(/\balpha\s*\(/)
    }
  })

  it('markdown + collapsible + corner tab use AssistantChatAnswer', () => {
    const md = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiMarkdownBlock.tsx'),
      'utf8'
    )
    const collapsible = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiCollapsibleBlock.tsx'),
      'utf8'
    )
    const corner = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiCornerTabSectionBlock.tsx'),
      'utf8'
    )
    expect(md).toContain('AssistantChatAnswer')
    expect(md).not.toContain('MarkdownContent')
    expect(collapsible).toContain('AssistantChatAnswer')
    expect(collapsible).not.toContain('MarkdownContent')
    expect(corner).toContain('AssistantChatAnswer')
    expect(corner).not.toContain('MarkdownContent')
  })

  it('block surface and steps use Panel / plexon-assistant classes', () => {
    const surface = readFileSync(
      path.join(root, 'components/assistant-ui/templates/UiBlockSurface.tsx'),
      'utf8'
    )
    const steps = readFileSync(
      path.join(root, 'components/assistant-ui/organisms/UiStepList.tsx'),
      'utf8'
    )
    const css = readFileSync(path.join(root, 'styles/globals.css'), 'utf8')
    expect(surface).toContain("from '@msqdx/ui'")
    expect(surface).toContain('plexon-assistant-block-surface')
    expect(steps).toContain('plexon-assistant-steps')
    expect(css).toContain('.plexon-assistant-steps')
    expect(css).toContain('.plexon-assistant-entity-card')
    expect(css).toContain('.plexon-assistant-capabilities')
    expect(css).toContain('.plexon-assistant-block-title')
    const uiText = readFileSync(path.join(root, 'components/assistant-ui/atoms/UiText.tsx'), 'utf8')
    expect(uiText).toContain('resolveUiTextTypography')
    expect(uiText).toContain("size: 'lg'")
  })

  it('block header uses compact title size', () => {
    const header = readFileSync(
      path.join(root, 'components/assistant-ui/molecules/UiBlockHeader.tsx'),
      'utf8',
    )
    expect(header).toContain('size="xl"')
  })

  it('capabilities overview and phase indicator are @msqdx/ui only', () => {
    const caps = readFileSync(
      path.join(root, 'components/assistant/AssistantCapabilitiesOverview.tsx'),
      'utf8'
    )
    const phase = readFileSync(
      path.join(root, 'components/assistant/AgentPhaseIndicator.tsx'),
      'utf8'
    )
    expect(caps).toContain("from '@msqdx/ui'")
    expect(caps).toContain('plexon-assistant-capabilities')
    expect(phase).toContain('Spinner')
    expect(phase).toContain('plexon-assistant-phase')
  })
})
