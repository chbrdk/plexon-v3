/**
 * Bootstrap home company for session users (E2E / onboarding).
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const root = path.join(__dirname, '..')

describe('platform me bootstrap-home', () => {
  it('ships route and helper', () => {
    expect(existsSync(path.join(root, 'app/api/platform/me/bootstrap-home/route.ts'))).toBe(true)
    expect(existsSync(path.join(root, 'lib/bootstrap-user-home.ts'))).toBe(true)
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8')
    expect(constants).toContain('API_PLATFORM_ME_BOOTSTRAP_HOME')
  })
})
