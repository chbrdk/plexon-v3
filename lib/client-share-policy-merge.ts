/**
 * Pure Client Page Share policy merge (P6). Spec: creation-client-share.md
 */

export type ClientSharePolicy = {
  enabled: boolean;
  allowPublicLink: boolean;
  requirePassword: boolean;
  maxTtlDays: number | null;
  allowLiveHead: boolean;
  allowEmailAllowlist: boolean;
};

export const DEFAULT_CLIENT_SHARE_POLICY: ClientSharePolicy = {
  enabled: true,
  allowPublicLink: false,
  requirePassword: true,
  maxTtlDays: 30,
  allowLiveHead: true,
  allowEmailAllowlist: true,
};

/** Restrictive company → Collection merge. */
export function mergeClientSharePolicy(
  company: ClientSharePolicy,
  collection: ClientSharePolicy | null
): ClientSharePolicy {
  if (!collection) return { ...company };
  return {
    enabled: company.enabled && collection.enabled,
    allowPublicLink: company.allowPublicLink && collection.allowPublicLink,
    requirePassword: company.requirePassword || collection.requirePassword,
    allowLiveHead: company.allowLiveHead && collection.allowLiveHead,
    allowEmailAllowlist: company.allowEmailAllowlist && collection.allowEmailAllowlist,
    maxTtlDays: minPositiveOrNull(company.maxTtlDays, collection.maxTtlDays),
  };
}

function minPositiveOrNull(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/** True when `next` tries to allow something company forbids. */
export function collectionPolicyLoosensCompany(
  company: ClientSharePolicy,
  next: ClientSharePolicy
): string | null {
  if (!company.enabled && next.enabled) return 'company_disables_client_share';
  if (!company.allowPublicLink && next.allowPublicLink) return 'company_disallows_public_link';
  if (company.requirePassword && !next.requirePassword) return 'company_requires_password';
  if (!company.allowLiveHead && next.allowLiveHead) return 'company_disallows_live_head';
  if (!company.allowEmailAllowlist && next.allowEmailAllowlist) {
    return 'company_disallows_email_allowlist';
  }
  if (
    typeof company.maxTtlDays === 'number' &&
    (next.maxTtlDays === null || next.maxTtlDays > company.maxTtlDays)
  ) {
    return 'company_max_ttl';
  }
  return null;
}
