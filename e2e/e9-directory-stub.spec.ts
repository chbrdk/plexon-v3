/**
 * E9 Directory stub — ready:false; password disable without provider → 400.
 * Playbook: knowledge/suite-use-case-testing.md
 */
import { apiPaths, e2eCredentials, expect, loginAndBootstrap, test } from './helpers'

test.describe('E9 directory stub', () => {
  test('GET ready false and PATCH password disable requires provider', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    const home = await loginAndBootstrap(page)
    const get = await page.request.get(apiPaths.companyDirectory(home.companyId))
    expect(get.ok()).toBeTruthy()
    const dir = (await get.json()) as {
      ready?: boolean
      provider?: string
      note?: string
    }
    expect(dir.ready).toBe(false)
    expect(dir.provider).toBe('none')
    // No secrets in panel JSON
    const raw = JSON.stringify(dir).toLowerCase()
    expect(raw).not.toContain('client_secret')
    expect(raw).not.toContain('clientsecret')

    const patch = await page.request.patch(apiPaths.companyDirectory(home.companyId), {
      data: { passwordLoginDisabled: true },
    })
    expect(patch.status()).toBe(400)
    const err = (await patch.json()) as { error?: string }
    expect(err.error).toBe('provider_required_to_disable_password')
  })
})
