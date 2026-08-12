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

/** Compact page-context block budget in the system prompt. */
export const ASSISTANT_MAX_PAGE_CONTEXT_CHARS = 6_000

export type AssistantPageContextProduct = Exclude<AssistantEmbedProduct, 'unknown'>

export type AssistantPageContext = {
  product: AssistantPageContextProduct
  pathname: string
  capability?: string
  platformProjectId?: string
  entityType?: string
  entityId?: string
}

export function isAssistantPageContextProduct(
  value: string | null | undefined
): value is AssistantPageContextProduct {
  return value === 'plexon' || value === 'audion' || value === 'checkion' || value === 'brandion' || value === 'creation'
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
  if (typeof row.entityType === 'string' && row.entityType.trim()) {
    out.entityType = row.entityType.trim()
  }
  if (typeof row.entityId === 'string' && row.entityId.trim()) {
    out.entityId = row.entityId.trim()
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
    entityType: overlay.entityType ?? base.entityType,
    entityId: overlay.entityId ?? base.entityId,
  }
}

/**
 * URL fallback when a page has not published React context yet.
 * EQC: `/event-quick-check` + optional `?run=`.
 */
export function derivePageContextFromLocation(input: {
  product: AssistantPageContextProduct
  pathname: string | null | undefined
  search?: string | null | undefined
}): AssistantPageContext | null {
  const pathname = (input.pathname ?? '').trim() || '/'
  if (!pathname.startsWith(PATH_EVENT_QUICK_CHECK)) {
    return {
      product: input.product,
      pathname,
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
  lines.push(
    'Der Nutzer betrachtet diese Seite. Beziehe dich darauf, wenn die Frage den aktuellen Kontext meint (z. B. „dieser Scan“, „dieser Quick Check“).'
  )
  return lines.join('\n')
}
