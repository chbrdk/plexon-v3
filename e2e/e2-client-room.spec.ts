/**
 * E2 ClientRoom — create room, set slot via session, public share resolves.
 * Playbook: knowledge/suite-use-case-testing.md · knowledge/client-room-slots.md
 */
import {
  apiPaths,
  e2eCredentials,
  expect,
  loginAndBootstrap,
  test,
} from './helpers'

test.describe('E2 client room', () => {
  test('create room, put checkion_overview slot, public page lists title', async ({ page }) => {
    test.skip(!e2eCredentials(), 'Set E2E_USER and E2E_PASSWORD')
    const home = await loginAndBootstrap(page)
    const id = home.platformProjectId

    const create = await page.request.post(apiPaths.collectionClientRoom(id), {
      data: { expiresInDays: 7 },
    })
    expect(create.ok(), await create.text()).toBeTruthy()
    const created = (await create.json()) as {
      room?: { id: string; revision: number; slots?: Record<string, unknown> }
      token?: string
      url?: string
    }
    expect(created.room?.id).toBeTruthy()
    expect(created.token?.startsWith('crm_')).toBeTruthy()

    const put = await page.request.put(apiPaths.collectionClientRoomSlot(id, 'checkion_overview'), {
      data: {
        productId: 'checkion',
        subjectRef: `e2e-${Date.now()}`,
        title: 'E2E Overview freigegeben',
        href: null,
      },
    })
    expect(put.ok(), await put.text()).toBeTruthy()
    const putJson = (await put.json()) as {
      room?: { slots?: { checkion_overview?: { title?: string } } }
    }
    expect(putJson.room?.slots?.checkion_overview?.title).toBe('E2E Overview freigegeben')

    const get = await page.request.get(apiPaths.collectionClientRoom(id))
    expect(get.ok()).toBeTruthy()
    const got = (await get.json()) as {
      room?: { slots?: { checkion_overview?: { title?: string } } }
    }
    expect(got.room?.slots?.checkion_overview?.title).toBe('E2E Overview freigegeben')

    await page.goto(`/share/room/${encodeURIComponent(created.token!)}`)
    await expect(page.locator('body')).toContainText(/E2E Overview freigegeben/i, {
      timeout: 20_000,
    })

    // Cleanup: revoke room so we do not leave public tokens around
    const revoke = await page.request.delete(apiPaths.collectionClientRoom(id))
    expect(revoke.ok(), await revoke.text()).toBeTruthy()
  })
})
