import { API_STATUS, apiError } from '@/lib/api-error-handler'
import { getRequestUser, isAdmin } from '@/lib/auth-request-user'
import { getDb } from '@/lib/db'
import {
  COMPANY_DIRECTORY_PROVIDERS,
  companyDirectorySettings,
  type CompanyDirectoryProvider,
} from '@/lib/db/schema'
import { canManageCompany } from '@/lib/auth-company-access'
import { eq } from 'drizzle-orm'

/**
 * Enterprise E9 — company directory stub (OIDC/SAML/SCIM not wired yet).
 * Spec: suite-enterprise-program.md § E9
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ companyId: string }> }
) {
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  const { companyId } = await ctx.params
  const id = companyId?.trim()
  if (!id) return apiError('Invalid company id', API_STATUS.BAD_REQUEST)

  const allowed = isAdmin(user) || (await canManageCompany(user, id))
  if (!allowed) return apiError('Forbidden', API_STATUS.FORBIDDEN)

  const db = getDb()
  const [row] = await db
    .select()
    .from(companyDirectorySettings)
    .where(eq(companyDirectorySettings.companyId, id))
    .limit(1)

  return Response.json({
    companyId: id,
    provider: (row?.provider as CompanyDirectoryProvider) ?? 'none',
    passwordLoginDisabled: row?.passwordLoginDisabled ?? false,
    scimEnabled: row?.scimEnabled ?? false,
    ready: false,
    note: 'OIDC/SAML/SCIM wiring follows; password login remains the default until provider is live.',
  })
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ companyId: string }> }
) {
  const user = await getRequestUser(request)
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED)
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503)

  const { companyId } = await ctx.params
  const id = companyId?.trim()
  if (!id) return apiError('Invalid company id', API_STATUS.BAD_REQUEST)

  const allowed = isAdmin(user) || (await canManageCompany(user, id))
  if (!allowed) return apiError('Forbidden', API_STATUS.FORBIDDEN)

  const body = (await request.json().catch(() => ({}))) as {
    provider?: string
    passwordLoginDisabled?: boolean
    scimEnabled?: boolean
  }

  if (
    body.provider &&
    !(COMPANY_DIRECTORY_PROVIDERS as readonly string[]).includes(body.provider)
  ) {
    return apiError('provider_invalid', API_STATUS.BAD_REQUEST)
  }

  /** Refuse disabling password until a provider is actually ready. */
  if (body.passwordLoginDisabled === true && (body.provider ?? 'none') === 'none') {
    return apiError('provider_required_to_disable_password', API_STATUS.BAD_REQUEST)
  }

  const db = getDb()
  const [existing] = await db
    .select()
    .from(companyDirectorySettings)
    .where(eq(companyDirectorySettings.companyId, id))
    .limit(1)

  const provider = (body.provider as CompanyDirectoryProvider | undefined) ??
    ((existing?.provider as CompanyDirectoryProvider) ?? 'none')
  const passwordLoginDisabled =
    body.passwordLoginDisabled ?? existing?.passwordLoginDisabled ?? false
  const scimEnabled = body.scimEnabled ?? existing?.scimEnabled ?? false

  if (passwordLoginDisabled && provider === 'none') {
    return apiError('provider_required_to_disable_password', API_STATUS.BAD_REQUEST)
  }

  if (existing) {
    await db
      .update(companyDirectorySettings)
      .set({
        provider,
        passwordLoginDisabled,
        scimEnabled,
        updatedAt: new Date(),
      })
      .where(eq(companyDirectorySettings.companyId, id))
  } else {
    await db.insert(companyDirectorySettings).values({
      companyId: id,
      provider,
      passwordLoginDisabled,
      scimEnabled,
      config: {},
      updatedAt: new Date(),
    })
  }

  return Response.json({
    companyId: id,
    provider,
    passwordLoginDisabled,
    scimEnabled,
    ready: false,
  })
}
