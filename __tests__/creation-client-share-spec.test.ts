import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('creation client page share specs', () => {
  it('domain + eval exist and separate invite from client share', () => {
    const domain = path.join(root, 'specs/domain/creation-client-share.md')
    const invite = path.join(root, 'specs/domain/collection-invite-links.md')
    expect(existsSync(domain)).toBe(true)
    expect(existsSync(invite)).toBe(true)

    const text = readFileSync(domain, 'utf8')
    expect(text).toContain('Collection-scoped')
    expect(text).toContain('clientShare')
    expect(text).toContain('view-only')
    expect(text).not.toMatch(/grants Collection membership/i)

    const inviteText = readFileSync(invite, 'utf8')
    expect(inviteText).toContain('Same company')
  })

  it('paths.md documents Creation client share pointer', () => {
    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8')
    expect(paths).toContain('creation-client-share.md')
    expect(paths).toContain('client-page-share')
  })
})
