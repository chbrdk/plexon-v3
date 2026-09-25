/**
 * UC9 Lagebild — Collection list / home + E1/E4 distillate APIs.
 * Playbook: knowledge/suite-use-case-testing.md
 */
import {
  apiPaths,
  e2eCredentials,
  expect,
  loginAndBootstrap,
  test,
} from './helpers'

test.describe('UC9 lagebild', () => {
  test('projects list loads after login', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    await loginAndBootstrap(page)
    await page.goto('/projects')
    await expect(page.locator('body')).toBeVisible()
    const status = await page.evaluate(() => document.body.innerText.slice(0, 200))
    expect(status.toLowerCase()).not.toContain('internal server error')
  })

  test('collection home shows capability entry hints', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    const home = await loginAndBootstrap(page)
    await page.goto(`/projects/${home.platformProjectId}`)
    await expect(page.locator('body')).toBeVisible()
    // Client-rendered capability chrome — wait for at least one product label
    await expect(page.locator('body')).toContainText(/checkion|audion/i, { timeout: 20_000 })
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body.includes('checkion') && body.includes('audion')).toBeTruthy()
  })

  test('audit and activity APIs return lists for bootstrap collection', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    const home = await loginAndBootstrap(page)
    const audit = await page.request.get(apiPaths.collectionAudit(home.platformProjectId))
    expect(audit.ok()).toBeTruthy()
    const auditJson = (await audit.json()) as { items?: unknown[] }
    expect(Array.isArray(auditJson.items)).toBeTruthy()

    const activity = await page.request.get(apiPaths.collectionActivity(home.platformProjectId))
    expect(activity.ok()).toBeTruthy()
    const activityJson = (await activity.json()) as { items?: unknown[] }
    expect(Array.isArray(activityJson.items)).toBeTruthy()
  })
})
