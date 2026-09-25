/**
 * E8 Krise — template create must keep enterprise-crisis-v1 (not silent page-quality).
 * Playbook: knowledge/suite-use-case-testing.md
 */
import {
  ENTERPRISE_TEMPLATE_CRISIS,
  apiPaths,
  e2eCredentials,
  expect,
  loginAndBootstrap,
  test,
} from './helpers'

test.describe('E8 crisis template', () => {
  test('POST flows keeps enterprise-crisis-v1 templateId', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    const home = await loginAndBootstrap(page)
    const res = await page.request.post(apiPaths.projectFlows(home.platformProjectId), {
      data: {
        name: `E2E Crisis ${Date.now()}`,
        templateId: ENTERPRISE_TEMPLATE_CRISIS,
      },
    })
    expect(res.status()).toBe(201)
    const body = (await res.json()) as {
      templateId?: string
      flow?: { templateId?: string }
    }
    expect(body.templateId).toBe(ENTERPRISE_TEMPLATE_CRISIS)
    expect(body.flow?.templateId).toBe(ENTERPRISE_TEMPLATE_CRISIS)
  })
})
