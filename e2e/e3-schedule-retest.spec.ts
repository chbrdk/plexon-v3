/**
 * E3 schedule/retest — flows API health + document shapes via UI entry.
 * Cron tick is covered in unit tests; E2E only ensures surface + API health.
 */
import { e2eCredentials, expect, loginIfConfigured, test } from './helpers'

test.describe('E3 schedule retest', () => {
  test('api health reports federation contract', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const json = (await res.json()) as { federationContractVersion?: string }
    expect(json.federationContractVersion).toBe('2026-05-plexon-federation-v3')
  })

  test('collection flows route is addressable when logged in', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    await loginIfConfigured(page)
    await page.goto('/projects')
    const link = page.locator('a[href*="/projects/"]').first()
    if ((await link.count()) === 0) {
      test.skip(true, 'No Collection links on /projects')
      return
    }
    const href = await link.getAttribute('href')
    const id = href!.split('/projects/')[1]?.split(/[/?#]/)[0]
    const api = await page.request.get(`/api/platform/projects/${id}/flows`)
    // 200 list or 401/403 if session cookie not forwarded — page itself must load
    await page.goto(`/projects/${id}/flows`)
    await expect(page.locator('body')).toBeVisible()
    expect([200, 401, 403]).toContain(api.status())
  })
})
