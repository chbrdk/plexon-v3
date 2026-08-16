import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('collection projects domain (phase 0)', () => {
  it('spec documents 1A create-both and fresh start (no backfill)', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/collection-projects.md'), 'utf8')
    expect(spec).toContain('1A')
    expect(spec).toContain('Fresh start')
    expect(spec).toContain('ensureBindingPlaceholders')
    expect(spec).toContain('brandion')
    expect(spec).toContain('cancelled')
    expect(spec).toContain('Insights list Collections only')
    expect(spec).toContain('Canonical list + create hub')
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
    expect(knowledge).toContain('brandion')
    expect(knowledge).toContain('brandion-project-origin')
  })

  it('user-facing copy uses Collection language', () => {
    const en = readFileSync(path.join(root, 'locales/en.json'), 'utf8')
    const de = readFileSync(path.join(root, 'locales/de.json'), 'utf8')
    expect(en).toContain('"platformInsightsTitle": "Your projects"')
    expect(en).toContain('"productsTitle": "Capabilities"')
    expect(en).toContain('openAssistant')
    expect(de).toContain('"platformInsightsTitle": "Deine Projekte"')
    expect(de).toContain('"productsTitle": "Fähigkeiten"')
  })

  it('phase 2 wires Collection home and assistant project param', () => {
    const home = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8',
    )
    const spec = readFileSync(path.join(root, 'specs/domain/collection-projects.md'), 'utf8')
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8')
    const chip = readFileSync(
      path.join(root, 'components/assistant/ProjectContextChip.tsx'),
      'utf8',
    )
    const chat = readFileSync(path.join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    expect(spec).toContain('Overview magazine')
    expect(home).toContain('collection-project-home')
    expect(home).toContain('CollectionOverviewBand')
    expect(home).toContain('pathAssistantWithProject')
    expect(constants).toContain('ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM')
    expect(chip).toContain("from '@msqdx/ui'")
    expect(chip).not.toContain("from '@mui/material'")
    expect(chat).toContain('ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM')
  })

  it('insights route is Collections-only (no standalone import)', () => {
    const route = readFileSync(
      path.join(root, 'app/api/platform/me/project-insights/route.ts'),
      'utf8',
    )
    expect(route).toContain('Collections only')
    expect(route).not.toContain('buildStandaloneProductInsightRows')
  })

  it('phase 5 documents archive/restore and admin hard-delete', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/collection-projects.md'), 'utf8')
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8')
    const lifecycle = readFileSync(path.join(root, 'lib/platform-project-lifecycle.ts'), 'utf8')
    expect(spec).toContain('Phase 5 — Lifecycle')
    expect(spec).toContain('Hard-Delete')
    expect(constants).toContain('apiPlatformProject')
    expect(lifecycle).toContain('hardDeletePlatformProjectAfterArchive')
    expect(lifecycle).toContain('setPlatformProjectLifecycleStatus')
  })

  it('phase 6 documents CREATION bindings landed (Wave 3)', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/collection-projects.md'), 'utf8')
    const knowledge = readFileSync(path.join(root, 'knowledge/creation-v3-onboarding.md'), 'utf8')
    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8')
    expect(spec).toContain('CREATION capability mirror')
    expect(spec).toContain('creation-project-origin')
    expect(spec).toContain('sync-capability-mirrors')
    expect(spec).toContain('accessible-collections')
    expect(spec).toContain('provisioning/projects/:platformProjectId/sync')
    expect(knowledge).toContain('NEXT_PUBLIC_CREATION_URL')
    expect(knowledge).toContain('landed')
    expect(knowledge).toContain('creation-project-origin')
    expect(paths).toContain('sync-capability-mirrors')
    expect(paths).toContain('accessible-collections')
    expect(paths).toContain('provisioning/projects/{platformProjectId}/sync')
  })

  it('phase 7 documents SPIRION bindings', () => {
    const spec = readFileSync(path.join(root, 'specs/domain/collection-projects.md'), 'utf8')
    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8')
    const cheatsheet = readFileSync(
      path.join(root, 'knowledge/coolify-plexon-v3-env-cheatsheet.md'),
      'utf8',
    )
    expect(spec).toContain('SPIRION capability mirror')
    expect(spec).toContain('spirion-project-origin')
    expect(spec).toContain('ensureBindingPlaceholders(checkion, audion, brandion, creation, spirion)')
    expect(paths).toContain('NEXT_PUBLIC_SPIRION_URL')
    expect(paths).toContain('spirion-project-origin')
    expect(cheatsheet).toContain('4e. Wave E — SPIRION')
    expect(cheatsheet).toContain('NEXT_PUBLIC_SPIRION_URL')
  })
})
