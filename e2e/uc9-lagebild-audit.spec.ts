/**
 * UC9 Lagebild — Collection list / home smoke.
 * Playbook: knowledge/suite-use-case-testing.md
 */
import { e2eCredentials, expect, loginIfConfigured, test } from './helpers'

test.describe('UC9 lagebild', () => {
  test('projects list loads after login', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    await loginIfConfigured(page)
    await page.goto('/projects')
    await expect(page.locator('body')).toBeVisible()
    // Collection cards or empty state — not a 5xx shell
    const status = await page.evaluate(() => document.body.innerText.slice(0, 200))
    expect(status.toLowerCase()).not.toContain('internal server error')
  })
})
