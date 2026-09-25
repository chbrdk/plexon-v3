/**
 * E5 Launch-Gate — gallery surface + template create keeps enterprise templateId.
 * Playbook: knowledge/suite-use-case-testing.md
 */
import {
  ENTERPRISE_TEMPLATE_LAUNCH_GATE,
  apiPaths,
  e2eCredentials,
  expect,
  loginAndBootstrap,
  test,
  waitForCollectionLink,
} from './helpers'

test.describe('E5 launch gate', () => {
  test('flows gallery page loads for first visible project if any', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    await loginAndBootstrap(page)
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
    expect(
      body.includes('launch') ||
        body.includes('gate') ||
        body.includes('flow') ||
        body.includes('vorlage') ||
        body.includes('template') ||
        body.includes('enterprise')
    ).toBeTruthy()
  })

  test('POST flows keeps enterprise-launch-gate-v1 templateId', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    const home = await loginAndBootstrap(page)
    const res = await page.request.post(apiPaths.projectFlows(home.platformProjectId), {
      data: {
        name: `E2E Launch Gate ${Date.now()}`,
        templateId: ENTERPRISE_TEMPLATE_LAUNCH_GATE,
      },
    })
    expect(res.status()).toBe(201)
    const body = (await res.json()) as {
      templateId?: string
      flow?: { templateId?: string }
    }
    expect(body.templateId).toBe(ENTERPRISE_TEMPLATE_LAUNCH_GATE)
    expect(body.flow?.templateId).toBe(ENTERPRISE_TEMPLATE_LAUNCH_GATE)
  })
})
