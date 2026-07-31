import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('collection projects domain (phase 0)', () => {
  it('spec documents 1A create-both and Phase 1 done', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/collection-projects.md'), 'utf8')
    expect(spec).toContain('1A')
    expect(spec).toContain('2C')
    expect(spec).toContain('ensureBindingPlaceholders')
    expect(spec).toContain('Phase 1 (done')
  })

  it('create-project-scope always returns platform', () => {
    const scope = readFileSync(path.join(root, 'lib/assistant/create-project-scope.ts'), 'utf8')
    expect(scope).toContain("export type CreateProjectTarget = 'platform'")
    expect(scope).toContain("return 'platform'")
    expect(scope).not.toContain("return 'audion'")
  })

  it('central-creation knowledge matches Collection always-both target', () => {
    const knowledge = readFileSync(
      path.join(root, 'knowledge/platform-projects-central-creation.md'),
      'utf8',
    )
    expect(knowledge).toContain('collection-projects.md')
    expect(knowledge).toContain('Create invariant (1A)')
    expect(knowledge).toContain('checkion')
    expect(knowledge).toContain('audion')
  })

  it('user-facing copy uses Collection language and legacy labels', () => {
    const en = readFileSync(path.join(root, 'locales/en.json'), 'utf8')
    const de = readFileSync(path.join(root, 'locales/de.json'), 'utf8')
    expect(en).toContain('"platformInsightsTitle": "Your projects"')
    expect(en).toContain('platformInsightsLegacyBadge')
    expect(en).toContain('"productsTitle": "Capabilities"')
    expect(en).toContain('openAssistant')
    expect(de).toContain('"platformInsightsTitle": "Deine Projekte"')
    expect(de).toContain('platformInsightsLegacyBadge')
    expect(de).toContain('"productsTitle": "Fähigkeiten"')
  })

  it('phase 2 wires Collection home and assistant project param', () => {
    const home = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8',
    )
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8')
    const chip = readFileSync(
      path.join(root, 'components/assistant/ProjectContextChip.tsx'),
      'utf8',
    )
    const chat = readFileSync(path.join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    expect(home).toContain('collection-project-home')
    expect(home).toContain('pathAssistantWithProject')
    expect(constants).toContain('ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM')
    expect(chip).toContain("from '@msqdx/ui'")
    expect(chip).not.toContain("from '@mui/material'")
    expect(chat).toContain('isSyntheticInsightPlatformProjectId')
    expect(chat).toContain('ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM')
  })
})
