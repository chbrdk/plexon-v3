import { getAudionMcpUrl, getBrandionMcpUrl, getCheckionMcpUrl } from '@/lib/constants';
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements';
import type { AssistantPageContext } from '@/lib/assistant/page-context';

export type ProductMcpEntitlementRow = {
  status?: string | null;
} | null | undefined;

export type AssistantProductMcpId = 'checkion' | 'audion' | 'brandion';

/**
 * Free-chat MCP gate: URL must be set, then any of:
 * - product entitlement `active`
 * - pageContext.product matches this product
 * - pageContext is another platform shell (plexon / sibling product) — Collection cross-ask
 * - any sibling product entitlement is active (seeded platform user without matching row)
 */
export function resolveUseProductMcp(input: {
  product: AssistantProductMcpId;
  mcpUrl: string | undefined;
  productEntitlement?: ProductMcpEntitlementRow;
  pageContext?: Pick<AssistantPageContext, 'product'> | null;
  hasAnyActiveEntitlement?: boolean;
}): boolean {
  if (!input.mcpUrl) return false;
  if (input.productEntitlement?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE) return true;
  const host = input.pageContext?.product;
  if (host === input.product) return true;
  if (host === 'plexon' || host === 'audion' || host === 'checkion' || host === 'brandion') {
    return true;
  }
  if (input.hasAnyActiveEntitlement) return true;
  return false;
}

export function resolveUseAudionMcp(input: {
  audionEntitlement?: ProductMcpEntitlementRow;
  pageContext?: Pick<AssistantPageContext, 'product'> | null;
  hasAnyActiveEntitlement?: boolean;
  mcpUrl?: string | undefined;
}): boolean {
  return resolveUseProductMcp({
    product: 'audion',
    mcpUrl: input.mcpUrl !== undefined ? input.mcpUrl : getAudionMcpUrl(),
    productEntitlement: input.audionEntitlement,
    pageContext: input.pageContext,
    hasAnyActiveEntitlement: input.hasAnyActiveEntitlement,
  });
}

export function resolveUseBrandionMcp(input: {
  brandionEntitlement?: ProductMcpEntitlementRow;
  pageContext?: Pick<AssistantPageContext, 'product'> | null;
  hasAnyActiveEntitlement?: boolean;
  mcpUrl?: string | undefined;
}): boolean {
  return resolveUseProductMcp({
    product: 'brandion',
    mcpUrl: input.mcpUrl !== undefined ? input.mcpUrl : getBrandionMcpUrl(),
    productEntitlement: input.brandionEntitlement,
    pageContext: input.pageContext,
    hasAnyActiveEntitlement: input.hasAnyActiveEntitlement,
  });
}

export function resolveUseCheckionMcp(input: {
  checkionEntitlement?: ProductMcpEntitlementRow;
  pageContext?: Pick<AssistantPageContext, 'product'> | null;
  hasAnyActiveEntitlement?: boolean;
  mcpUrl?: string | undefined;
}): boolean {
  return resolveUseProductMcp({
    product: 'checkion',
    mcpUrl: input.mcpUrl !== undefined ? input.mcpUrl : getCheckionMcpUrl(),
    productEntitlement: input.checkionEntitlement,
    pageContext: input.pageContext,
    hasAnyActiveEntitlement: input.hasAnyActiveEntitlement,
  });
}
