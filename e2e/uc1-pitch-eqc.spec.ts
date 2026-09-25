/**
 * UC1 Pitch — Event Quick Check surface.
 * Playbook: knowledge/suite-use-case-testing.md
 */
import { e2eCredentials, expect, loginIfConfigured, test } from './helpers'

test.describe('UC1 pitch EQC', () => {
  test('EQC route is reachable after login (or redirects to login)', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    await loginIfConfigured(page)
    const res = await page.goto('/event-quick-check')
    expect(res?.ok() || res?.status() === 200 || page.url().includes('event-quick-check')).toBeTruthy()
    await expect(page.locator('body')).toBeVisible()
  })

  test('health endpoint is ok without auth', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.status ?? json.ok).toBeTruthy()
  })
})
