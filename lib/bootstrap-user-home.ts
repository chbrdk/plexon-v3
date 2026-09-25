/**
 * Ensure a session user has a home company (+ optional first Collection).
 * Used by register onboarding and E2E staging setup.
 */

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import type { RequestUser } from '@/lib/auth-request-user'
import { listUserCompanies } from '@/lib/assistant/user-eligibility'
import { createPlatformProjectWorkflow } from '@/lib/assistant/workflows/create-platform-project'
import { getDb } from '@/lib/db'
import { addCompanyUser, createCompany } from '@/lib/db/companies'
import { users } from '@/lib/db/schema'
import { COMPANY_USER_ROLE } from '@/lib/platform-companies'

export type BootstrapUserHomeResult = {
  ok: true
  companyId: string
  companyCreated: boolean
  platformProjectId?: string
  collectionCreated: boolean
}

export async function ensureUserHomeCompany(user: RequestUser): Promise<{
  companyId: string
  created: boolean
}> {
  const existing = await listUserCompanies(user.id)
  if (existing[0]) {
    return { companyId: existing[0].id, created: false }
  }

  const db = getDb()
  const [row] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  const label = (row?.name?.trim() || row?.email?.split('@')[0] || 'User').slice(0, 48)
  const companyId = randomUUID()
  const slugBase = `home-${user.id.replace(/-/g, '').slice(0, 12)}`
  await createCompany({
    id: companyId,
    name: `${label} Org`,
    slug: slugBase,
  })
  await addCompanyUser({
    companyId,
    userId: user.id,
    role: COMPANY_USER_ROLE.OWNER,
  })
  return { companyId, created: true }
}

export async function bootstrapUserHome(
  user: RequestUser,
  options?: { createCollection?: boolean; collectionName?: string }
): Promise<BootstrapUserHomeResult> {
  const home = await ensureUserHomeCompany(user)
  let platformProjectId: string | undefined
  let collectionCreated = false

  if (options?.createCollection !== false) {
    const created = await createPlatformProjectWorkflow(
      user,
      {
        name: options?.collectionName?.trim() || 'E2E Suite Collection',
        domain: 'example.com',
        companyId: home.companyId,
        syncProducts: true,
      },
      {}
    )
    if (created.result.ok && created.result.platformProjectId) {
      platformProjectId = created.result.platformProjectId
      collectionCreated = true
    }
  }

  return {
    ok: true,
    companyId: home.companyId,
    companyCreated: home.created,
    platformProjectId,
    collectionCreated,
  }
}
