import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('ui rebuild foundation inventory', () => {
  it('ships AGENTS, shell spec, and knowledge docs', () => {
    for (const rel of [
      'AGENTS.md',
      'specs/domain/app-shell.md',
      'knowledge/paths.md',
      'knowledge/ui-rebuild-msqdx-ui.md',
      'lib/msqdx-ui.ts',
      'lib/msqdx-ui-shell.ts',
      'lib/shell-paths.ts',
    ]) {
      expect(existsSync(path.join(root, rel)), rel).toBe(true)
    }
  })

  it('depends on @msqdx/ui not @msqdx/react', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    expect(pkg.dependencies['@msqdx/ui']).toBeTruthy()
    expect(pkg.dependencies['@msqdx/ui-tokens']).toBeTruthy()
    expect(pkg.dependencies['@msqdx/react']).toBeUndefined()
    expect(pkg.dependencies['@mui/material']).toBeUndefined()
  })

  it('imports @msqdx/ui styles in globals', () => {
    const css = readFileSync(path.join(root, 'styles/globals.css'), 'utf8')
    expect(
      css.includes("@import '@msqdx/ui/styles.css'") ||
        css.includes("msqdx-ui/packages/ui/src/styles.css"),
    ).toBe(true)
  })

  it('ships migrate specs for waves 1–7', () => {
    for (const rel of [
      'specs/domain/ui-migrate.md',
      'specs/domain/ui-migrate-dashboard.md',
      'specs/domain/ui-migrate-settings.md',
      'specs/domain/ui-migrate-products.md',
      'specs/domain/ui-migrate-admin.md',
      'specs/domain/ui-migrate-assistant.md',
      'specs/domain/ui-migrate-event-quick-check.md',
      'specs/domain/ui-migrate-board.md',
    ]) {
      expect(existsSync(path.join(root, rel)), rel).toBe(true)
    }
  })
})
