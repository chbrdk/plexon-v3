export const PLATFORM_PRODUCT_IDS = ['plexon', 'checkion', 'audion', 'videon', 'brandion', 'creation', 'dig'] as const;
export type PlatformProductId = (typeof PLATFORM_PRODUCT_IDS)[number];

export const PLATFORM_ENTITLEMENT_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const;
export type PlatformEntitlementStatus =
  (typeof PLATFORM_ENTITLEMENT_STATUS)[keyof typeof PLATFORM_ENTITLEMENT_STATUS];

export const PLATFORM_ROLE = {
  MEMBER: 'member',
  MANAGER: 'manager',
  ADMIN: 'admin',
} as const;
export type PlatformRole = (typeof PLATFORM_ROLE)[keyof typeof PLATFORM_ROLE];

export const PLATFORM_ACCESS_STATUS = {
  GRANTED: 'granted',
  DISABLED: 'disabled',
  HIDDEN: 'hidden',
} as const;
export type PlatformAccessStatus = (typeof PLATFORM_ACCESS_STATUS)[keyof typeof PLATFORM_ACCESS_STATUS];

export type PlatformLaunchContext = {
  entryPointId?: string | null;
  projectId?: string | null;
  deepLink?: string | null;
};

export type PlatformLaunchPayload = PlatformLaunchContext & {
  platformRole?: PlatformRole | null;
};

export type PlatformProductAccess = {
  status: PlatformAccessStatus;
  visible: boolean;
  launchable: boolean;
  platformRole: PlatformRole | null;
  source: 'default' | 'explicit' | 'admin';
};

export type StoredPlatformEntitlement = {
  userId: string;
  productId: PlatformProductId;
  status: PlatformEntitlementStatus;
  platformRole: PlatformRole;
  defaultContext: PlatformLaunchContext | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ManagedPlatformEntitlementInput = {
  productId: PlatformProductId;
  status: PlatformEntitlementStatus;
  platformRole: PlatformRole;
  defaultContext: PlatformLaunchContext | null;
};

function normalizeString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function isPlatformProductId(value: unknown): value is PlatformProductId {
  return typeof value === 'string' && PLATFORM_PRODUCT_IDS.includes(value as PlatformProductId);
}

export function isPlatformEntitlementStatus(value: unknown): value is PlatformEntitlementStatus {
  return typeof value === 'string' && Object.values(PLATFORM_ENTITLEMENT_STATUS).includes(value as PlatformEntitlementStatus);
}

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === 'string' && Object.values(PLATFORM_ROLE).includes(value as PlatformRole);
}

export function normalizePlatformLaunchContext(value: unknown): PlatformLaunchContext | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const entryPointId = normalizeString(raw.entryPointId);
  const projectId = normalizeString(raw.projectId);
  const deepLink = normalizeString(raw.deepLink);

  const context: PlatformLaunchContext = {};
  if (entryPointId) context.entryPointId = entryPointId;
  if (projectId) context.projectId = projectId;
  if (deepLink) context.deepLink = deepLink;

  return Object.keys(context).length > 0 ? context : null;
}
