import type { RequestUser } from '@/lib/auth-request-user';
import { canViewCompany } from '@/lib/auth-company-access';
import { getCompanyIdsForUser, getCompanyById } from '@/lib/db/companies';
import { getUserProductEntitlementsMap } from '@/lib/db/product-entitlements';
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements';

export type UserCompanyOption = {
  id: string;
  name: string;
};

export async function listUserCompanies(userId: string): Promise<UserCompanyOption[]> {
  const companyIds = await getCompanyIdsForUser(userId);
  const out: UserCompanyOption[] = [];
  for (const id of companyIds) {
    const company = await getCompanyById(id);
    if (company) out.push({ id: company.id, name: company.name });
  }
  return out;
}

export async function userHasProductEntitlement(userId: string): Promise<boolean> {
  const entitlements = await getUserProductEntitlementsMap(userId);
  for (const productId of ['checkion', 'audion'] as const) {
    const row = entitlements[productId];
    if (row?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE) return true;
  }
  return false;
}

export async function userCanCreatePlatformProject(
  user: RequestUser,
  companyId: string
): Promise<boolean> {
  if (!(await canViewCompany(user, companyId))) return false;
  return userHasProductEntitlement(user.id);
}

export async function resolveDefaultCompanyId(userId: string): Promise<string | null> {
  const companies = await listUserCompanies(userId);
  return companies[0]?.id ?? null;
}
