/**
 * Assistant host page context — specs/domain/assistant-page-context.md
 */

import {
  EVENT_QUICK_CHECK_RUN_QUERY_PARAM,
  PATH_EVENT_QUICK_CHECK,
} from '@/lib/paths/event-quick-check-page'
import type { AssistantEmbedProduct } from '@/lib/paths/assistant-embed'

/** Capability id when the user is on Event Quick Check. */
export const ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK = 'event_quick_check' as const

/** Entity for an EQC workflow run (`?run=`). */
export const ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN = 'event_quick_check_run' as const

/** Capability id when the user is in the CREATION composition editor. */
export const ASSISTANT_CAPABILITY_CREATION_EDITOR = 'creation_editor' as const

/** Entity for an open composition scene in the CREATION editor. */
export const ASSISTANT_ENTITY_COMPOSITION_SCENE = 'composition_scene' as const

/** METRON dashboard / KPI / dataset entities (Wave 3 page context). */
export const ASSISTANT_ENTITY_METRON_DASHBOARD = 'dashboard' as const
export const ASSISTANT_ENTITY_METRON_KPI = 'kpi' as const
export const ASSISTANT_ENTITY_METRON_DATASET = 'dataset' as const

/** CHECKION scan / GEO entities (suite page context Wave 2). */
export const ASSISTANT_ENTITY_PAGE_SCAN = 'page_scan' as const
export const ASSISTANT_ENTITY_DOMAIN_SCAN = 'domain_scan' as const
export const ASSISTANT_ENTITY_GEO_JOB = 'geo_job' as const

/** AUDION detail entities. */
export const ASSISTANT_ENTITY_PERSONA = 'persona' as const
export const ASSISTANT_ENTITY_TARGET_GROUP = 'target_group' as const
export const ASSISTANT_ENTITY_JOURNEY = 'journey' as const
export const ASSISTANT_ENTITY_STUDY = 'study' as const

/** BRANDION guideline / token set. */
export const ASSISTANT_ENTITY_GUIDELINE = 'guideline' as const
export const ASSISTANT_ENTITY_TOKEN_SET = 'token_set' as const

/** VIDEON media / cut / analysis. */
export const ASSISTANT_ENTITY_VIDEON_MEDIA = 'media' as const
export const ASSISTANT_ENTITY_VIDEON_CUT = 'cut' as const
export const ASSISTANT_ENTITY_VIDEON_ANALYSIS = 'analysis' as const

/** Compact page-context block budget in the system prompt. */
export const ASSISTANT_MAX_PAGE_CONTEXT_CHARS = 6_000

export type AssistantPageContextProduct = Exclude<AssistantEmbedProduct, 'unknown'>

export type AssistantPageContext = {
  product: AssistantPageContextProduct
  pathname: string
  capability?: string
  platformProjectId?: string
  /** Company id for company KPI library tools (Wave 5). */
  platformCompanyId?: string
  entityType?: string
  entityId?: string
  /** Optimistic-lock token for scene_apply_ops (CREATION editor). */
  entityUpdatedAt?: string
  /**
   * Product-local hints for tool-arg inject only — never dumped into the system prompt.
   * Keys/values are short non-empty strings (max 64 / 128 chars).
   */
  entityMeta?: Record<string, string>
}

export function isAssistantPageContextProduct(
  value: string | null | undefined
): value is AssistantPageContextProduct {
  return (
    value === 'plexon' ||
    value === 'audion' ||
    value === 'checkion' ||
    value === 'brandion' ||
    value === 'creation' ||
    value === 'echon' ||
    value === 'spirion' ||
    value === 'metron' ||
    value === 'videon'
  )
}

/** Parse/validate complete-body or postMessage pageContext. */
export function parseAssistantPageContext(raw: unknown): AssistantPageContext | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (!isAssistantPageContextProduct(typeof row.product === 'string' ? row.product : null)) {
    return null
  }
  const pathname = typeof row.pathname === 'string' ? row.pathname.trim() : ''
  if (!pathname) return null

  const out: AssistantPageContext = {
    product: row.product as AssistantPageContextProduct,
    pathname,
  }
  if (typeof row.capability === 'string' && row.capability.trim()) {
    out.capability = row.capability.trim()
  }
  if (typeof row.platformProjectId === 'string' && row.platformProjectId.trim()) {
    out.platformProjectId = row.platformProjectId.trim()
  }
  if (typeof row.platformCompanyId === 'string' && row.platformCompanyId.trim()) {
    out.platformCompanyId = row.platformCompanyId.trim()
  }
  if (typeof row.entityType === 'string' && row.entityType.trim()) {
    out.entityType = row.entityType.trim()
  }
  if (typeof row.entityId === 'string' && row.entityId.trim()) {
    out.entityId = row.entityId.trim()
  }
  if (typeof row.entityUpdatedAt === 'string' && row.entityUpdatedAt.trim()) {
    out.entityUpdatedAt = row.entityUpdatedAt.trim()
  }
  if (row.entityMeta && typeof row.entityMeta === 'object' && !Array.isArray(row.entityMeta)) {
    const meta: Record<string, string> = {}
    let count = 0
    for (const [k, v] of Object.entries(row.entityMeta as Record<string, unknown>)) {
      if (count >= 16) break
      const key = typeof k === 'string' ? k.trim().slice(0, 64) : ''
      const val = typeof v === 'string' ? v.trim().slice(0, 128) : ''
      if (!key || !val) continue
      meta[key] = val
      count += 1
    }
    if (count > 0) out.entityMeta = meta
  }
  return out
}

export function mergeAssistantPageContext(
  base: AssistantPageContext | null | undefined,
  overlay: AssistantPageContext | null | undefined
): AssistantPageContext | null {
  if (!base && !overlay) return null
  if (!base) return overlay ?? null
  if (!overlay) return base
  return {
    product: overlay.product || base.product,
    pathname: overlay.pathname || base.pathname,
    capability: overlay.capability ?? base.capability,
    platformProjectId: overlay.platformProjectId ?? base.platformProjectId,
    platformCompanyId: overlay.platformCompanyId ?? base.platformCompanyId,
    entityType: overlay.entityType ?? base.entityType,
    entityId: overlay.entityId ?? base.entityId,
    entityUpdatedAt: overlay.entityUpdatedAt ?? base.entityUpdatedAt,
    entityMeta: overlay.entityMeta ?? base.entityMeta,
  }
}

/**
 * URL fallback when a page has not published React context yet.
 * - EQC: `/event-quick-check` + optional `?run=`
 * - Collection: `/projects/{platformProjectId}/…` or `?platformProjectId=`
 */
export function derivePageContextFromLocation(input: {
  product: AssistantPageContextProduct
  pathname: string | null | undefined
  search?: string | null | undefined
}): AssistantPageContext | null {
  const pathname = (input.pathname ?? '').trim() || '/'

  let platformProjectId: string | undefined
  try {
    const params = new URLSearchParams(input.search ?? '')
    const fromQuery = params.get('platformProjectId')?.trim()
    if (fromQuery) platformProjectId = fromQuery
  } catch {
    /* ignore */
  }
  if (!platformProjectId) {
    const m = pathname.match(/^\/projects\/([^/]+)(?:\/|$)/)
    if (m?.[1]) {
      try {
        platformProjectId = decodeURIComponent(m[1]).trim() || undefined
      } catch {
        platformProjectId = m[1].trim() || undefined
      }
    }
  }

  if (!pathname.startsWith(PATH_EVENT_QUICK_CHECK)) {
    return {
      product: input.product,
      pathname,
      ...(platformProjectId ? { platformProjectId } : {}),
    }
  }

  let runId: string | undefined
  try {
    const params = new URLSearchParams(input.search ?? '')
    const run = params.get(EVENT_QUICK_CHECK_RUN_QUERY_PARAM)?.trim()
    if (run) runId = run
  } catch {
    /* ignore */
  }

  return {
    product: input.product,
    pathname,
    capability: ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK,
    entityType: runId ? ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN : undefined,
    entityId: runId,
    ...(platformProjectId ? { platformProjectId } : {}),
  }
}

/** Thin route hint when hydrate fails or no entity. */
export function buildPageContextRouteHint(ctx: AssistantPageContext): string {
  const lines = [
    '## Aktueller Seitenkontext',
    `- Produkt: ${ctx.product}`,
    `- Pfad: ${ctx.pathname}`,
  ]
  if (ctx.capability) lines.push(`- Capability: ${ctx.capability}`)
  if (ctx.platformProjectId) lines.push(`- platformProjectId: ${ctx.platformProjectId}`)
  if (ctx.entityType && ctx.entityId) {
    lines.push(`- Entity: ${ctx.entityType} (${ctx.entityId})`)
  }
  if (ctx.entityUpdatedAt) {
    lines.push(`- entityUpdatedAt: ${ctx.entityUpdatedAt}`)
  }
  lines.push(
    'Der Nutzer betrachtet diese Seite. Beziehe dich darauf, wenn die Frage den aktuellen Kontext meint (z. B. „dieser Scan“, „dieser Quick Check“, „diese Persona“).',
  )
  if (ctx.platformProjectId) {
    lines.push(
      'Collection/platformProjectId ist aus der URL bekannt — nicht nach dem Projekt fragen; Tools im Kontext dieser Collection ausführen.',
    )
  }
  return lines.join('\n')
}
