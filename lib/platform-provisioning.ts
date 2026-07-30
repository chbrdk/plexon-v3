import { createHash } from 'crypto';
import type {
  PlatformEntitlementStatus,
  PlatformLaunchContext,
  PlatformProductId,
  PlatformRole,
} from '@/lib/platform-entitlements';
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements';

export const PLATFORM_PROVISIONING_DESIRED_STATE = {
  GRANTED: 'granted',
  DISABLED: 'disabled',
} as const;
export type PlatformProvisioningDesiredState =
  (typeof PLATFORM_PROVISIONING_DESIRED_STATE)[keyof typeof PLATFORM_PROVISIONING_DESIRED_STATE];

export const PLATFORM_PROVISIONING_SYNC_STATUS = {
  PENDING: 'pending',
  IN_SYNC: 'in_sync',
  FAILED: 'failed',
  DISABLED: 'disabled',
  NOT_SUPPORTED: 'not_supported',
} as const;
export type PlatformProvisioningSyncStatus =
  (typeof PLATFORM_PROVISIONING_SYNC_STATUS)[keyof typeof PLATFORM_PROVISIONING_SYNC_STATUS];

export const PLATFORM_PROVISIONING_RESULT_STATUS = {
  APPLIED: 'applied',
  NO_CHANGE: 'no_change',
  DISABLED: 'disabled',
  FAILED: 'failed',
} as const;
export type PlatformProvisioningResultStatus =
  (typeof PLATFORM_PROVISIONING_RESULT_STATUS)[keyof typeof PLATFORM_PROVISIONING_RESULT_STATUS];

export const PLATFORM_PROJECT_ASSIGNMENT_ROLE = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;
export type PlatformProjectAssignmentRole =
  (typeof PLATFORM_PROJECT_ASSIGNMENT_ROLE)[keyof typeof PLATFORM_PROJECT_ASSIGNMENT_ROLE];

export type PlatformProjectAssignment = {
  projectId: string;
  role: PlatformProjectAssignmentRole;
};

export type StoredPlatformProjectAssignment = {
  userId: string;
  productId: PlatformProductId;
  projectId: string;
  role: PlatformProjectAssignmentRole;
  createdAt: Date;
  updatedAt: Date;
};

export type ManagedPlatformProjectAssignmentInput = {
  productId: PlatformProductId;
  projectId: string;
  role: PlatformProjectAssignmentRole;
};

export type StoredPlatformProvisioning = {
  userId: string;
  productId: PlatformProductId;
  desiredState: PlatformProvisioningDesiredState;
  syncStatus: PlatformProvisioningSyncStatus;
  syncMessage: string | null;
  lastAttemptAt: Date | null;
  lastSucceededAt: Date | null;
  lastSourceHash: string | null;
  externalUserRef: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ManagedPlatformProvisioningInput = {
  productId: PlatformProductId;
  desiredState: PlatformProvisioningDesiredState;
  syncStatus: PlatformProvisioningSyncStatus;
  syncMessage?: string | null;
  lastAttemptAt?: Date | null;
  lastSucceededAt?: Date | null;
  lastSourceHash?: string | null;
  externalUserRef?: string | null;
};

export type PlatformProvisioningUserProfile = {
  userId: string;
  email: string;
  name?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
};

export type PlatformProvisioningRequestPayload = PlatformProvisioningUserProfile & {
  desiredState: PlatformProvisioningDesiredState;
  platformRole: PlatformRole;
  defaultContext: PlatformLaunchContext | null;
  projectAssignments: PlatformProjectAssignment[];
  contractVersion: string;
  source: string;
  requestedAt: string;
};

export type PlatformProvisioningResponse = {
  status: PlatformProvisioningResultStatus;
  externalUserRef?: string | null;
  details?: string | null;
};

export function isPlatformProvisioningDesiredState(
  value: unknown
): value is PlatformProvisioningDesiredState {
  return (
    typeof value === 'string' &&
    Object.values(PLATFORM_PROVISIONING_DESIRED_STATE).includes(
      value as PlatformProvisioningDesiredState
    )
  );
}

export function isPlatformProvisioningSyncStatus(
  value: unknown
): value is PlatformProvisioningSyncStatus {
  return (
    typeof value === 'string' &&
    Object.values(PLATFORM_PROVISIONING_SYNC_STATUS).includes(value as PlatformProvisioningSyncStatus)
  );
}

export function isPlatformProvisioningResultStatus(
  value: unknown
): value is PlatformProvisioningResultStatus {
  return (
    typeof value === 'string' &&
    Object.values(PLATFORM_PROVISIONING_RESULT_STATUS).includes(
      value as PlatformProvisioningResultStatus
    )
  );
}

export function isPlatformProjectAssignmentRole(
  value: unknown
): value is PlatformProjectAssignmentRole {
  return (
    typeof value === 'string' &&
    Object.values(PLATFORM_PROJECT_ASSIGNMENT_ROLE).includes(value as PlatformProjectAssignmentRole)
  );
}

export function getProvisioningDesiredState(
  status: PlatformEntitlementStatus
): PlatformProvisioningDesiredState {
  return status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE
    ? PLATFORM_PROVISIONING_DESIRED_STATE.GRANTED
    : PLATFORM_PROVISIONING_DESIRED_STATE.DISABLED;
}

export function buildProvisioningSourceHash(
  payload: Pick<
    PlatformProvisioningRequestPayload,
    | 'userId'
    | 'email'
    | 'name'
    | 'company'
    | 'avatarUrl'
    | 'locale'
    | 'desiredState'
    | 'platformRole'
    | 'defaultContext'
    | 'projectAssignments'
  >
): string {
  const serialized = JSON.stringify({
    userId: payload.userId,
    email: payload.email,
    name: payload.name ?? null,
    company: payload.company ?? null,
    avatarUrl: payload.avatarUrl ?? null,
    locale: payload.locale ?? null,
    desiredState: payload.desiredState,
    platformRole: payload.platformRole,
    defaultContext: payload.defaultContext
      ? {
          entryPointId: payload.defaultContext.entryPointId ?? null,
          projectId: payload.defaultContext.projectId ?? null,
          deepLink: payload.defaultContext.deepLink ?? null,
        }
      : null,
    projectAssignments: [...payload.projectAssignments]
      .map((assignment) => ({
        projectId: assignment.projectId,
        role: assignment.role,
      }))
      .sort((a, b) => a.projectId.localeCompare(b.projectId) || a.role.localeCompare(b.role)),
  });
  return createHash('sha256').update(serialized).digest('hex');
}
