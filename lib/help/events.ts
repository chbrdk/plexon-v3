/**
 * Browser events bridging Help Hub ↔ Platform Assistant.
 * Spec: specs/domain/suite-help-docs.md
 */

export const HELP_OPEN_EVENT = 'plexon:help-open'
export const ASSISTANT_OPEN_FROM_HELP_EVENT = 'plexon:assistant-open-from-help'

export type HelpOpenDetail = {
  articleId?: string | null
  query?: string | null
}

export type AssistantOpenFromHelpDetail = {
  articleId: string
  title?: string
  draft?: string
}

export function dispatchHelpOpen(detail: HelpOpenDetail = {}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HELP_OPEN_EVENT, { detail }))
}

export function dispatchAssistantOpenFromHelp(detail: AssistantOpenFromHelpDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_FROM_HELP_EVENT, { detail }))
}
