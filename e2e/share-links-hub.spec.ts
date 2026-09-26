/**
 * Collection Share Links hub — inventory API + dashboard chrome.
 * Spec: knowledge/suite-use-case-testing.md · collection-share-links.md
 */
import {
  apiPaths,
  e2eCredentials,
  expect,
  loginAndBootstrap,
  test,
} from './helpers'

test.describe('Collection share links hub', () => {
  test('GET share-links returns items array; Collection home has hub, not ClientRoom', async ({
    page,
  }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    const home = await loginAndBootstrap(page)

    const res = await page.request.get(apiPaths.collectionShareLinks(home.platformProjectId))
    expect(res.ok(), await res.text()).toBeTruthy()
    const json = (await res.json()) as { items?: unknown[] }
    expect(Array.isArray(json.items)).toBeTruthy()

    await page.goto(`/projects/${home.platformProjectId}`)
    await expect(page.getByTestId('collection-share-links-panel')).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByTestId('collection-client-room-panel')).toHaveCount(0)
  })
})
