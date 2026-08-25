/**
 * Inject Collection platformProjectId into Spirion/DIG search tools.
 * Spec: specs/domain/assistant-spirion-mcp.md — live federation requires project id on search.
 * Do NOT inject into captures_list (unbound staging library).
 */
import type { AssistantPageContext } from '@/lib/assistant/page-context';

/** Anthropic or MCP names that need platformProjectId in DIG_FEDERATION_MODE=live. */
const SPIRION_SEARCH_NEEDS_PROJECT =
  /(screens_search|references_search|reference_get|reference_pack|dig_screen_|dig_reference_)/i;

export function isSpirionSearchToolName(toolName: string): boolean {
  return SPIRION_SEARCH_NEEDS_PROJECT.test(toolName);
}

export function isSpirionOrDigToolName(toolName: string): boolean {
  return /^(spirion_|dig_)/.test(toolName) || /^spirion\./.test(toolName) || /^dig\./.test(toolName);
}

export function injectSpirionToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    pageContext?: AssistantPageContext | null;
    platformProjectId?: string | null;
  },
): Record<string, unknown> {
  if (!isSpirionSearchToolName(toolName)) return input;

  const existing =
    typeof input.platformProjectId === 'string' ? input.platformProjectId.trim() : '';
  if (existing) return input;

  const fromPage = ctx.pageContext?.platformProjectId?.trim() || '';
  const fromConv = ctx.platformProjectId?.trim() || '';
  const id = fromPage || fromConv;
  if (!id) return input;

  return { ...input, platformProjectId: id };
}
