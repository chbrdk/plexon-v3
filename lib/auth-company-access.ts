import type { RequestUser } from '@/lib/auth-request-user';
import { isAdmin } from '@/lib/auth-request-user';
import { COMPANY_USER_ROLE, type CompanyUserRole } from '@/lib/platform-companies';
import { getCompanyUserRole } from '@/lib/db/companies';

const COMPANY_MANAGE_ROLES: CompanyUserRole[] = [
  COMPANY_USER_ROLE.OWNER,
  COMPANY_USER_ROLE.ADMIN,
];

export async function canManageCompany(user: RequestUser | null, companyId: string): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const role = await getCompanyUserRole(companyId, user.id);
  return role !== null && COMPANY_MANAGE_ROLES.includes(role);
}

export async function canViewCompany(user: RequestUser | null, companyId: string): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const role = await getCompanyUserRole(companyId, user.id);
  return role !== null;
}
