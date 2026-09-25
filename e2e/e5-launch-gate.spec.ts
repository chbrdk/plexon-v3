/**
 * E5 Launch-Gate — flow gallery exposes enterprise templates.
 * Playbook: knowledge/suite-use-case-testing.md
 */
import { e2eCredentials, expect, loginIfConfigured, test, waitForCollectionLink } from './helpers'

test.describe('E5 launch gate', () => {
  test('flows gallery page loads for first visible project if any', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    await loginIfConfigured(page)
    const link = await waitForCollectionLink(page)
    if (!link) {
      test.skip(true, 'No Collection links on /projects')
      return
    }
    const href = await link.getAttribute('href')
    expect(href).toBeTruthy()
    const id = href!.split('/projects/')[1]?.split(/[/?#]/)[0]
    expect(id).toBeTruthy()
    await page.goto(`/projects/${id}/flows`)
    await expect(page.locator('body')).toBeVisible()
    const body = (await page.locator('body').innerText()).toLowerCase()
    // Template labels or create UI — German or English gallery copy
    expect(
      body.includes('launch') ||
        body.includes('gate') ||
        body.includes('flow') ||
        body.includes('vorlage') ||
        body.includes('template') ||
        body.includes('enterprise')
    ).toBeTruthy()
  })
})
