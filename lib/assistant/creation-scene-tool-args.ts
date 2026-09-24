import {
  hasCreationEditorSceneContext,
} from '@/lib/assistant/scene-write-intent';
import type { AssistantPageContext } from '@/lib/assistant/page-context';
import { injectSpirionToolArgs } from '@/lib/assistant/spirion-tool-args';
import { injectMetronToolArgs } from '@/lib/assistant/metron-tool-args';

function isCreationSceneFamilyTool(toolName: string): boolean {
  return (
    /^creation_(scene_|editor_|brand_tokens|site_kit)/.test(toolName) ||
    /^creation\.(scene_|editor_|brand_tokens|site_kit)/.test(toolName)
  );
}

function needsOptimisticLock(toolName: string): boolean {
  return /apply_ops|import_html/.test(toolName);
}

/**
 * LLMs often pass `ops` (and similar) as a JSON string instead of a native array.
 * Coerce before MCP Zod validation so apply_ops actually writes the scene.
 */
export function coerceJsonArrayArg(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
}

function coerceCreationWriteArgs(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
  if (!/apply_ops/.test(toolName)) return input;
  let out = input;
  if ('ops' in input) {
    const ops = coerceJsonArrayArg(input.ops);
    if (ops !== input.ops) out = { ...out, ops };
  }
  const list = out.ops;
  if (!Array.isArray(list)) return out;
  const normalized = list.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const op = { ...(raw as Record<string, unknown>) };
    const kind = typeof op.op === 'string' ? op.op : '';
    if (
      kind === 'set_prop' ||
      kind === 'set_style' ||
      kind === 'set_token_binding' ||
      kind === 'clear_token_binding'
    ) {
      const key =
        (typeof op.key === 'string' && op.key.trim()) ||
        (typeof op.prop === 'string' && op.prop.trim()) ||
        (typeof op.property === 'string' && op.property.trim()) ||
        '';
      if (key) op.key = key;
    }
    return op;
  });
  return { ...out, ops: normalized };
}

/** Extract scene updatedAt from CREATION ops/import tool JSON (success or stale 409). */
export function extractCreationSceneUpdatedAt(toolResult: unknown): string | null {
  const raw =
    typeof toolResult === 'string'
      ? toolResult
      : toolResult != null
        ? JSON.stringify(toolResult)
        : '';
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim()) {
      return parsed.updatedAt.trim();
    }
    const scene = parsed.scene;
    if (scene && typeof scene === 'object' && !Array.isArray(scene)) {
      const updatedAt = (scene as { updatedAt?: unknown }).updatedAt;
      if (typeof updatedAt === 'string' && updatedAt.trim()) return updatedAt.trim();
    }
  } catch {
    /* ignore non-JSON */
  }
  return null;
}

/** Inject sceneId, baseUpdatedAt, and actorUserId for CREATION MCP scene tools. */
export function injectCreationSceneToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    pageContext?: AssistantPageContext | null;
    actorUserId: string;
    /** Turn-local lock from prior successful write / stale response in this completion. */
    sceneLockUpdatedAt?: string | null;
  },
): Record<string, unknown> {
  if (!isCreationSceneFamilyTool(toolName)) return input;

  const out = coerceCreationWriteArgs(toolName, { ...input });
  // Always use the authenticated session user — LLM-supplied display names
  // (e.g. "cb") cause CREATION Collection ACL 403s.
  if (ctx.actorUserId.trim()) {
    out.actorUserId = ctx.actorUserId.trim();
  }

  if (!hasCreationEditorSceneContext(ctx.pageContext)) return out;

  const sceneId = ctx.pageContext!.entityId!.trim();
  // Prefer editor-bound scene — model-supplied ids often point at demos / stale chats.
  out.sceneId = sceneId;

  if (needsOptimisticLock(toolName)) {
    const lock = typeof out.baseUpdatedAt === 'string' ? out.baseUpdatedAt.trim() : '';
    if (!lock) {
      const turnLock = ctx.sceneLockUpdatedAt?.trim() || '';
      const pageLock = ctx.pageContext!.entityUpdatedAt?.trim() || '';
      const next = turnLock || pageLock;
      if (next) out.baseUpdatedAt = next;
    }
  }

  return out;
}

/** Creation scene args + Spirion + VIDEON + METRON + CHECKION/AUDION/BRANDION actor injection. */
export function injectAssistantMcpToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    pageContext?: AssistantPageContext | null;
    actorUserId: string;
    platformProjectId?: string | null;
    audionProjectId?: string | null;
    checkionProjectId?: string | null;
    sceneLockUpdatedAt?: string | null;
  },
): Record<string, unknown> {
  const withCreation = injectCreationSceneToolArgs(toolName, input, ctx);
  const withSpirion = injectSpirionToolArgs(toolName, withCreation, ctx);
  const withVideon = injectVideonToolArgs(toolName, withSpirion, ctx);
  const withMetron = injectMetronToolArgs(toolName, withVideon, ctx);
  const withCheckion = injectCheckionToolArgs(toolName, withMetron, ctx);
  const withAudion = injectAudionToolArgs(toolName, withCheckion, ctx);
  return injectBrandionToolArgs(toolName, withAudion, ctx);
}

/**
 * Inject authenticated session user into CHECKION MCP tools (Access Model B).
 * Spec: specs/domain/assistant-actor-identity.md
 */
export function injectCheckionToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: { actorUserId: string; checkionProjectId?: string | null; platformProjectId?: string | null },
): Record<string, unknown> {
  if (!/^checkion([._]|$)/i.test(toolName)) return input;
  if (/health$/i.test(toolName)) return input;
  const out = { ...input };
  if (ctx.actorUserId.trim()) {
    out.actorUserId = ctx.actorUserId.trim();
  }
  const existingProject =
    typeof out.projectId === 'string'
      ? out.projectId.trim()
      : typeof out.checkionProjectId === 'string'
        ? out.checkionProjectId.trim()
        : '';
  const fromCtx = ctx.checkionProjectId?.trim() || '';
  if (!existingProject && fromCtx) {
    out.projectId = fromCtx;
    out.checkionProjectId = fromCtx;
  }
  return out;
}

/**
 * Inject authenticated session user into AUDION MCP tools (Access Model B).
 * Also injects conversation Audion + Collection ids when the model omitted them
 * (prevents blind create / empty list under Access Model B).
 */
export function injectAudionToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    actorUserId: string;
    audionProjectId?: string | null;
    platformProjectId?: string | null;
  },
): Record<string, unknown> {
  if (!/^audion([._]|$)/i.test(toolName)) return input;
  if (/health$/i.test(toolName)) return input;
  const out = { ...input };
  if (ctx.actorUserId.trim()) {
    out.actorUserId = ctx.actorUserId.trim();
  }

  const fromCtxAudion = ctx.audionProjectId?.trim() || '';
  const fromCtxPlatform = ctx.platformProjectId?.trim() || '';

  const existingAudion =
    typeof out.projectId === 'string'
      ? out.projectId.trim()
      : typeof out.audionProjectId === 'string'
        ? out.audionProjectId.trim()
        : '';
  if (!existingAudion && fromCtxAudion) {
    out.projectId = fromCtxAudion;
    out.audionProjectId = fromCtxAudion;
  }

  const existingPlatform =
    typeof out.platformProjectId === 'string' ? out.platformProjectId.trim() : '';
  if (!existingPlatform && fromCtxPlatform) {
    out.platformProjectId = fromCtxPlatform;
  }

  return out;
}

/**
 * Inject authenticated session user into BRANDION MCP tools (Access Model B).
 */
export function injectBrandionToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: { actorUserId: string },
): Record<string, unknown> {
  if (!/^brandion([._]|$)/i.test(toolName)) return input;
  if (/health$/i.test(toolName)) return input;
  const out = { ...input };
  if (ctx.actorUserId.trim()) {
    out.actorUserId = ctx.actorUserId.trim();
  }
  return out;
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
