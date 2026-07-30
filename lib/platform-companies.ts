/** Company membership roles (PLEXON). */
export const COMPANY_USER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;
export type CompanyUserRole = (typeof COMPANY_USER_ROLE)[keyof typeof COMPANY_USER_ROLE];

export const PLATFORM_PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;
export type PlatformProjectStatus = (typeof PLATFORM_PROJECT_STATUS)[keyof typeof PLATFORM_PROJECT_STATUS];

/** Sync state for product mirror rows (`platform_project_product_bindings`). */
export const PLATFORM_PROJECT_BINDING_SYNC_STATUS = {
  PENDING: 'pending',
  IN_SYNC: 'in_sync',
  FAILED: 'failed',
} as const;
export type PlatformProjectBindingSyncStatus =
  (typeof PLATFORM_PROJECT_BINDING_SYNC_STATUS)[keyof typeof PLATFORM_PROJECT_BINDING_SYNC_STATUS];

export function isCompanyUserRole(value: unknown): value is CompanyUserRole {
  return typeof value === 'string' && Object.values(COMPANY_USER_ROLE).includes(value as CompanyUserRole);
}

export function isPlatformProjectStatus(value: unknown): value is PlatformProjectStatus {
  return typeof value === 'string' && Object.values(PLATFORM_PROJECT_STATUS).includes(value as PlatformProjectStatus);
}
