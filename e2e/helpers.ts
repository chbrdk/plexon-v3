import { expect, test, type Page } from '@playwright/test'

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
  return true
}

export { expect, test }
