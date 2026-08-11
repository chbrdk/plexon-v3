import { getBrandionMcpUrl } from '@/lib/constants';
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements';
import type { AssistantPageContext } from '@/lib/assistant/page-context';

export type BrandionMcpEntitlementRow = {
  status?: string | null;
} | null | undefined;

/**
 * Brandion MCP for free-chat when URL is configured and the user may use Brandion data:
 * - explicit brandion entitlement `active`, or
 * - embed/host pageContext.product === `brandion` (users often lack a seeded entitlement row).
 */
export function resolveUseBrandionMcp(input: {
  brandionEntitlement: BrandionMcpEntitlementRow;
  pageContext?: Pick<AssistantPageContext, 'product'> | null;
  mcpUrl?: string | undefined;
}): boolean {
  const url = input.mcpUrl !== undefined ? input.mcpUrl : getBrandionMcpUrl();
  if (!url) return false;
  if (input.brandionEntitlement?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE) return true;
  if (input.pageContext?.product === 'brandion') return true;
  return false;
}
