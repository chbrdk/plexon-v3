import { expect, test, type Locator, type Page } from '@playwright/test'

/** Mirror lib/constants — keep in sync with suite enterprise paths. */
export const apiPaths = {
  bootstrapHome: '/api/platform/me/bootstrap-home',
  collectionAudit: (platformProjectId: string) =>
    `/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId)}/audit`,
  collectionActivity: (platformProjectId: string) =>
    `/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId)}/activity`,
  projectFlows: (platformProjectId: string) =>
    `/api/platform/projects/${encodeURIComponent(platformProjectId)}/flows`,
  companyDirectory: (companyId: string) =>
    `/api/admin/companies/${encodeURIComponent(companyId)}/directory`,
}

export const ENTERPRISE_TEMPLATE_LAUNCH_GATE = 'enterprise-launch-gate-v1'
export const ENTERPRISE_TEMPLATE_CRISIS = 'enterprise-crisis-v1'

export function e2eCredentials(): { user: string; password: string } | null {
  const user = process.env.E2E_USER?.trim()
  const password = process.env.E2E_PASSWORD?.trim()
  if (!user || !password) return null
  return { user, password }
}

export type BootstrapHome = {
  companyId: string
  platformProjectId: string
  collectionCreated: boolean
}

export async function loginAndBootstrap(page: Page): Promise<BootstrapHome> {
  const creds = e2eCredentials()
  if (!creds) throw new Error('E2E_USER / E2E_PASSWORD required')
  await page.goto('/login')
  await page.getByLabel(/e-?mail|email/i).fill(creds.user)
  await page.getByLabel(/passwort|password/i).fill(creds.password)
  await page.getByRole('button', { name: /anmelden|sign in|login/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })

  const boot = await page.request.post(apiPaths.bootstrapHome, {
    data: { createCollection: true, collectionName: 'E2E Suite Collection' },
  })
  if (!boot.ok()) {
    throw new Error(`bootstrap-home failed: ${boot.status()} ${await boot.text()}`)
  }
  const json = (await boot.json()) as {
    ok?: boolean
    companyId?: string
    platformProjectId?: string
    collectionCreated?: boolean
  }
  if (!json.companyId) throw new Error('bootstrap-home missing companyId')

  let platformProjectId = json.platformProjectId?.trim() || ''
  if (!platformProjectId) {
    const link = await waitForCollectionLink(page)
    const href = link ? await link.getAttribute('href') : null
    platformProjectId = href?.split('/projects/')[1]?.split(/[/?#]/)[0] || ''
  }
  if (!platformProjectId) throw new Error('bootstrap-home missing platformProjectId')

  return {
    companyId: json.companyId,
    platformProjectId,
    collectionCreated: Boolean(json.collectionCreated),
  }
}

/** @deprecated Prefer loginAndBootstrap — kept for older specs. */
export async function loginIfConfigured(page: Page): Promise<boolean> {
  if (!e2eCredentials()) return false
  await loginAndBootstrap(page)
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
