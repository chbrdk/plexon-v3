import {
  hasCreationEditorSceneContext,
} from '@/lib/assistant/scene-write-intent';
import type { AssistantPageContext } from '@/lib/assistant/page-context';
import { injectSpirionToolArgs } from '@/lib/assistant/spirion-tool-args';

function isCreationSceneFamilyTool(toolName: string): boolean {
  return (
    /^creation_(scene_|editor_|brand_tokens|site_kit)/.test(toolName) ||
    /^creation\.(scene_|editor_|brand_tokens|site_kit)/.test(toolName)
  );
}

/** Inject sceneId, baseUpdatedAt, and actorUserId for CREATION MCP scene tools. */
export function injectCreationSceneToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    pageContext?: AssistantPageContext | null;
    actorUserId: string;
  },
): Record<string, unknown> {
  if (!isCreationSceneFamilyTool(toolName)) return input;

  const out = { ...input };
  // Always use the authenticated session user — LLM-supplied display names
  // (e.g. "cb") cause CREATION Collection ACL 403s.
  if (ctx.actorUserId.trim()) {
    out.actorUserId = ctx.actorUserId.trim();
  }

  if (!hasCreationEditorSceneContext(ctx.pageContext)) return out;

  const sceneId = ctx.pageContext!.entityId!.trim();
  const sceneArg = typeof out.sceneId === 'string' ? out.sceneId.trim() : '';
  if (!sceneArg) {
    out.sceneId = sceneId;
  }

  if (/apply_ops/.test(toolName)) {
    const lock = typeof out.baseUpdatedAt === 'string' ? out.baseUpdatedAt.trim() : '';
    if (!lock && ctx.pageContext!.entityUpdatedAt?.trim()) {
      out.baseUpdatedAt = ctx.pageContext!.entityUpdatedAt.trim();
    }
  }

  return out;
}

/** Creation scene args + Spirion search platformProjectId + VIDEON actor injection. */
export function injectAssistantMcpToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    pageContext?: AssistantPageContext | null;
    actorUserId: string;
    platformProjectId?: string | null;
  },
): Record<string, unknown> {
  const withCreation = injectCreationSceneToolArgs(toolName, input, ctx);
  const withSpirion = injectSpirionToolArgs(toolName, withCreation, ctx);
  return injectVideonToolArgs(toolName, withSpirion, ctx);
}

function isVideonMediaSearchTool(toolName: string): boolean {
  return /videon[._]media_search$/i.test(toolName);
}

/**
 * Inject authenticated session user into all VIDEON MCP tools (Access Model B).
 * For media_search, also inject page/conversation platformProjectId when missing
 * (scoped search — specs/domain/assistant-videon-mcp.md).
 */
export function injectVideonToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    actorUserId: string;
    pageContext?: AssistantPageContext | null;
    platformProjectId?: string | null;
  },
): Record<string, unknown> {
  if (!/^videon[._]/.test(toolName)) return input;
  if (/^videon[._]health$/.test(toolName)) return input;
  const out = { ...input };
  if (ctx.actorUserId.trim()) {
    out.actorUserId = ctx.actorUserId.trim();
  }

  if (isVideonMediaSearchTool(toolName)) {
    const existing =
      typeof out.platformProjectId === 'string' ? out.platformProjectId.trim() : '';
    if (!existing) {
      const fromPage = ctx.pageContext?.platformProjectId?.trim() || '';
      const fromConv = ctx.platformProjectId?.trim() || '';
      const id = fromPage || fromConv;
      if (id) out.platformProjectId = id;
    }
  }

  return out;
}
