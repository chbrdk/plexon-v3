/**
 * Inject Collection platformProjectId into Spirion/DIG search tools.
 * Spec: specs/domain/assistant-spirion-mcp.md — live federation requires project id on search.
 *
 * Library tools (`captures_list`, …) MUST omit platformProjectId: staging captures are mostly
 * unbound (`platform_project_id: null`). Passing the Collection id returns [] and the agent
 * falsely reports “0 Captures / Corpus leer”.
 */
import type { AssistantPageContext } from '@/lib/assistant/page-context';

/** Anthropic or MCP names that need platformProjectId in DIG_FEDERATION_MODE=live. */
const SPIRION_SEARCH_NEEDS_PROJECT =
  /(screens_search|references_search|reference_get|reference_pack|dig_screen_|dig_reference_)/i;

/** Global library — never scope by Collection project (unbound staging captures). */
const SPIRION_LIBRARY_STRIP_PROJECT =
  /(captures_list|analyses_list|analysis_get|capture_prompt_pack|enrichment_list|enrichment_get|jobs_list|job_get|health)/i;

export function isSpirionSearchToolName(toolName: string): boolean {
  return SPIRION_SEARCH_NEEDS_PROJECT.test(toolName);
}

export function isSpirionLibraryToolName(toolName: string): boolean {
  return SPIRION_LIBRARY_STRIP_PROJECT.test(toolName);
}

export function isSpirionOrDigToolName(toolName: string): boolean {
  return /^(spirion_|dig_)/.test(toolName) || /^spirion\./.test(toolName) || /^dig\./.test(toolName);
}

function stripProjectScope(input: Record<string, unknown>): Record<string, unknown> {
  const out = { ...input };
  delete out.platformProjectId;
  delete out.platform_project_id;
  delete out.digProjectId;
  delete out.dig_project_id;
  return out;
}

export function injectSpirionToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    pageContext?: AssistantPageContext | null;
    platformProjectId?: string | null;
  },
): Record<string, unknown> {
  // Agent often copies Collection id onto library calls → empty result set.
  if (isSpirionLibraryToolName(toolName)) {
    return stripProjectScope(input);
  }

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
