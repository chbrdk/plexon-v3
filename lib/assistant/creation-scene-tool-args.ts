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
 * Also injects scan/GEO entity ids from pageContext when the model omitted them.
 */
export function injectCheckionToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    actorUserId: string
    checkionProjectId?: string | null
    platformProjectId?: string | null
    pageContext?: AssistantPageContext | null
  },
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

  const entityType = ctx.pageContext?.entityType?.trim() || '';
  const entityId = ctx.pageContext?.entityId?.trim() || '';
  if (entityId) {
    if (
      entityType === 'page_scan' &&
      /scan_(overview|get|issues|detail)/i.test(toolName) &&
      !(typeof out.scanId === 'string' && out.scanId.trim()) &&
      !(typeof out.scan_id === 'string' && out.scan_id.trim()) &&
      !(typeof out.id === 'string' && out.id.trim())
    ) {
      out.scanId = entityId;
      out.scan_id = entityId;
      out.id = entityId;
    }
    if (
      entityType === 'domain_scan' &&
      /domain_scan_/i.test(toolName) &&
      !(typeof out.domainScanId === 'string' && out.domainScanId.trim()) &&
      !(typeof out.domain_scan_id === 'string' && out.domain_scan_id.trim()) &&
      !(typeof out.id === 'string' && out.id.trim())
    ) {
      out.domainScanId = entityId;
      out.domain_scan_id = entityId;
      out.id = entityId;
    }
    if (
      entityType === 'geo_job' &&
      /geo_/i.test(toolName) &&
      !(typeof out.geoJobId === 'string' && out.geoJobId.trim()) &&
      !(typeof out.jobId === 'string' && out.jobId.trim()) &&
      !(typeof out.id === 'string' && out.id.trim())
    ) {
      out.geoJobId = entityId;
      out.jobId = entityId;
      out.id = entityId;
    }
  }

  return out;
}

/**
 * Inject authenticated session user into AUDION MCP tools (Access Model B).
 * Also injects conversation Audion + Collection ids when the model omitted them
 * (prevents blind create / empty list under Access Model B).
 * On persona/TG/journey detail pages, injects the entity id for get tools.
 */
export function injectAudionToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    actorUserId: string;
    audionProjectId?: string | null;
    platformProjectId?: string | null;
    pageContext?: AssistantPageContext | null;
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
        : typeof out.project_id === 'string'
          ? out.project_id.trim()
          : '';

  const hasNameQuery =
    (typeof out.q === 'string' && out.q.trim()) ||
    (typeof out.search === 'string' && out.search.trim()) ||
    (typeof out.name === 'string' && out.name.trim());

  // Browse without a name: scope to Collection Audion project when known.
  // Name search (q): do NOT force project_id — stale conversation bindings
  // (e.g. accidental persona_bootstrap “Neues Projekt”) otherwise hide hits.
  // Access Model B: Audion lists across projects the viewer can access.
  if (!existingAudion && fromCtxAudion && !hasNameQuery) {
    out.projectId = fromCtxAudion;
    out.audionProjectId = fromCtxAudion;
    out.project_id = fromCtxAudion;
  } else if (existingAudion && !out.project_id && !hasNameQuery) {
    out.project_id = existingAudion;
  } else if (hasNameQuery && /personas_list/i.test(toolName)) {
    // Strip injected/stale project scope so fuzzy name search is suite-wide (viewer ACL).
    delete out.projectId;
    delete out.project_id;
    delete out.audionProjectId;
  }

  const existingPlatform =
    typeof out.platformProjectId === 'string' ? out.platformProjectId.trim() : '';
  if (!existingPlatform && fromCtxPlatform) {
    out.platformProjectId = fromCtxPlatform;
  }

  const entityType = ctx.pageContext?.entityType?.trim() || '';
  const entityId = ctx.pageContext?.entityId?.trim() || '';
  if (entityId) {
    const hasId =
      (typeof out.id === 'string' && out.id.trim()) ||
      (typeof out.personaId === 'string' && out.personaId.trim()) ||
      (typeof out.persona_id === 'string' && out.persona_id.trim()) ||
      (typeof out.targetGroupId === 'string' && out.targetGroupId.trim()) ||
      (typeof out.journeyId === 'string' && out.journeyId.trim());
    if (!hasId) {
      if (entityType === 'persona' && /persona/i.test(toolName) && !/personas_list/i.test(toolName)) {
        out.id = entityId;
        out.personaId = entityId;
        out.persona_id = entityId;
      }
      if (
        entityType === 'target_group' &&
        /target_group/i.test(toolName) &&
        !/target_groups_list/i.test(toolName)
      ) {
        out.id = entityId;
        out.targetGroupId = entityId;
      }
      if (entityType === 'journey' && /journey/i.test(toolName) && !/journeys_list/i.test(toolName)) {
        out.id = entityId;
        out.journeyId = entityId;
      }
    }
  }

  return out;
}

/**
 * Inject authenticated session user into BRANDION MCP tools (Access Model B).
 * Also injects Collection + guideline entity from pageContext when omitted.
 */
export function injectBrandionToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    actorUserId: string
    platformProjectId?: string | null
    pageContext?: AssistantPageContext | null
  },
): Record<string, unknown> {
  if (!/^brandion([._]|$)/i.test(toolName)) return input;
  if (/health$/i.test(toolName)) return input;
  const out = { ...input };
  if (ctx.actorUserId.trim()) {
    out.actorUserId = ctx.actorUserId.trim();
  }
  const fromPlatform =
    ctx.pageContext?.platformProjectId?.trim() || ctx.platformProjectId?.trim() || '';
  if (
    fromPlatform &&
    !(typeof out.platformProjectId === 'string' && out.platformProjectId.trim())
  ) {
    out.platformProjectId = fromPlatform;
  }
  const entityType = ctx.pageContext?.entityType?.trim() || '';
  const entityId = ctx.pageContext?.entityId?.trim() || '';
  if (
    entityId &&
    (entityType === 'guideline' || entityType === 'token_set') &&
    /guideline/i.test(toolName) &&
    !(typeof out.guidelineId === 'string' && out.guidelineId.trim()) &&
    !(typeof out.id === 'string' && out.id.trim())
  ) {
    out.guidelineId = entityId;
    out.id = entityId;
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

  const entityType = ctx.pageContext?.entityType?.trim() || '';
  const entityId = ctx.pageContext?.entityId?.trim() || '';
  if (entityId) {
    if (
      entityType === 'media' &&
      /media/i.test(toolName) &&
      !/media_search/i.test(toolName) &&
      !(typeof out.mediaAssetId === 'string' && out.mediaAssetId.trim()) &&
      !(typeof out.media_id === 'string' && out.media_id.trim()) &&
      !(typeof out.id === 'string' && out.id.trim())
    ) {
      out.mediaAssetId = entityId;
      out.media_id = entityId;
      out.id = entityId;
    }
    if (
      entityType === 'cut' &&
      /cut/i.test(toolName) &&
      !(typeof out.cutId === 'string' && out.cutId.trim()) &&
      !(typeof out.cut_id === 'string' && out.cut_id.trim()) &&
      !(typeof out.id === 'string' && out.id.trim())
    ) {
      out.cutId = entityId;
      out.cut_id = entityId;
      out.id = entityId;
    }
  }

  const fromPlatform =
    ctx.pageContext?.platformProjectId?.trim() || ctx.platformProjectId?.trim() || '';
  if (
    fromPlatform &&
    !(typeof out.platformProjectId === 'string' && out.platformProjectId.trim())
  ) {
    out.platformProjectId = fromPlatform;
  }

  return out;
}
