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

/** Creation scene args + Spirion search platformProjectId injection. */
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
  return injectSpirionToolArgs(toolName, withCreation, ctx);
}
