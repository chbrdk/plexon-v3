import { expect, test, type Locator, type Page } from '@playwright/test'

export function e2eCredentials(): { user: string; password: string } | null {
  const user = process.env.E2E_USER?.trim()
  const password = process.env.E2E_PASSWORD?.trim()
  if (!user || !password) return null
  return { user, password }
}

export async function loginIfConfigured(page: Page): Promise<boolean> {
  const creds = e2eCredentials()
  if (!creds) return false
  await page.goto('/login')
  await page.getByLabel(/e-?mail|email/i).fill(creds.user)
  await page.getByLabel(/passwort|password/i).fill(creds.password)
  await page.getByRole('button', { name: /anmelden|sign in|login/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
  // Company + first Collection so Flow gallery / E3 / E5 smokes have a target
  const boot = await page.request.post('/api/platform/me/bootstrap-home', {
    data: { createCollection: true, collectionName: 'E2E Suite Collection' },
  })
  if (!boot.ok()) {
    throw new Error(`bootstrap-home failed: ${boot.status()} ${await boot.text()}`)
  }
  return true
}

/** /projects cards are client-fetched — wait before reading hrefs. */
export async function waitForCollectionLink(page: Page): Promise<Locator | null> {
  await page.goto('/projects')
  const links = page.locator('a[href*="/projects/"]')
  try {
    await links.first().waitFor({ state: 'visible', timeout: 20_000 })
  } catch {
    return null
  }
  return links.first()
}

export { expect, test }
