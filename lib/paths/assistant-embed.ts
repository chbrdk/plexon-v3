/**
 * Assistant embed path builders — specs/api/assistant-embed.md
 * Re-exported from lib/constants.ts.
 */

export const PATH_ASSISTANT_EMBED = '/assistant/embed'

/** Shared with expand route — keep string aligned with lib/constants. */
const ASSISTANT_CONVERSATION_QUERY_PARAM = 'c'
const ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM = 'project'

export const ASSISTANT_EMBED_PRODUCT_QUERY_PARAM = 'product'
export const ASSISTANT_EMBED_CAPABILITY_QUERY_PARAM = 'capability'
export const ASSISTANT_EMBED_PATHNAME_QUERY_PARAM = 'pathname'
export const ASSISTANT_EMBED_THEME_QUERY_PARAM = 'theme'

export type AssistantEmbedProduct =
  | 'plexon'
  | 'audion'
  | 'checkion'
  | 'brandion'
  | 'creation'
  | 'echon'
  | 'spirion'
  | 'unknown'

export type AssistantEmbedQuery = {
  product: AssistantEmbedProduct | string
  platformProjectId?: string | null
  conversationId?: string | null
  capability?: string | null
  pathname?: string | null
  theme?: string | null
}

export function normalizeAssistantEmbedProduct(raw: string | null | undefined): AssistantEmbedProduct {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === 'dig') return 'spirion'
  if (
    value === 'plexon' ||
    value === 'audion' ||
    value === 'checkion' ||
    value === 'brandion' ||
    value === 'creation' ||
    value === 'echon' ||
    value === 'spirion'
  ) {
    return value
  }
  return 'unknown'
}

export function pathAssistantEmbed(query: AssistantEmbedQuery): string {
  const params = new URLSearchParams()
  params.set(ASSISTANT_EMBED_PRODUCT_QUERY_PARAM, normalizeAssistantEmbedProduct(query.product))
  const project = query.platformProjectId?.trim()
  if (project) params.set(ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM, project)
  const conversation = query.conversationId?.trim()
  if (conversation) params.set(ASSISTANT_CONVERSATION_QUERY_PARAM, conversation)
  const capability = query.capability?.trim()
  if (capability) params.set(ASSISTANT_EMBED_CAPABILITY_QUERY_PARAM, capability)
  const pathname = query.pathname?.trim()
  if (pathname) params.set(ASSISTANT_EMBED_PATHNAME_QUERY_PARAM, pathname)
  const theme = query.theme?.trim()
  if (theme) params.set(ASSISTANT_EMBED_THEME_QUERY_PARAM, theme)
  const qs = params.toString()
  return qs ? `${PATH_ASSISTANT_EMBED}?${qs}` : PATH_ASSISTANT_EMBED
}

export function buildAssistantEmbedUrl(plexonPublicBase: string, query: AssistantEmbedQuery): string {
  const base = plexonPublicBase.replace(/\/$/, '')
  return `${base}${pathAssistantEmbed(query)}`
}
