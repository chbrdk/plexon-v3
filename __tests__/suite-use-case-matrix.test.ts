/**
 * Use-case testing playbook contract.
 * Spec: knowledge/suite-use-case-testing.md
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const root = path.join(__dirname, '..')
const ALLOWED_MARKS = new Set(['Live', 'Fixture', 'Demo', 'Geplant'])

describe('suite use-case matrix', () => {
  it('ships playbook with UC1–UC9 and allowed marks only', () => {
    const playbook = path.join(root, 'knowledge/suite-use-case-testing.md')
    expect(existsSync(playbook)).toBe(true)
    const text = readFileSync(playbook, 'utf8')
    for (const uc of ['UC1', 'UC2', 'UC3', 'UC4', 'UC5', 'UC6', 'UC7', 'UC8', 'UC9']) {
      expect(text).toContain(uc)
    }
    expect(text).toContain('by design')
    expect(text).toContain('Single')
    // Bold mark table cells / definitions use **Live** etc.
    for (const mark of ALLOWED_MARKS) {
      expect(text).toContain(mark)
    }
  })

  it('documents E2E env keys without embedding secrets', () => {
    const pathsDoc = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8')
    expect(pathsDoc).toContain('E2E_BASE_URL')
    expect(pathsDoc).toContain('E2E_USER')
    expect(pathsDoc).toContain('E2E_PASSWORD')
    expect(pathsDoc).not.toMatch(/E2E_PASSWORD=.+@/)
  })
})
