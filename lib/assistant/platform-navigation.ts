/**
 * Compact platform navigation for the assistant system prompt.
 * Spec: specs/domain/assistant-platform-navigation.md
 * Paths: knowledge/paths.md · lib/constants.ts
 */

import {
  PATH_ASSISTANT,
  PATH_EVENT_QUICK_CHECK,
  PATH_HOME,
  PATH_PRODUCTS,
  PATH_PROJECTS,
  PATH_SETTINGS,
  getAudionAdminUrl,
  getBrandionUrl,
  getCheckionUrl,
  pathAssistantChat,
  pathEventQuickCheckRun,
  pathPlatformProjectDashboard,
  pathPlatformProjectFlows,
} from '@/lib/constants'
import {
  ASSISTANT_MAX_PLATFORM_NAV_CHARS,
  truncateAssistantText,
} from '@/lib/assistant/context-budget'

const PLATFORM_PROJECT_ID_PLACEHOLDER = '{platformProjectId}'
const WORKFLOW_RUN_ID_PLACEHOLDER = '{workflowRunId}'
const CONVERSATION_ID_PLACEHOLDER = '{conversationId}'

function trimOrigin(value: string | null | undefined): string | null {
  const t = value?.trim()
  if (!t) return null
  return t.replace(/\/+$/, '')
}

/** Canonical in-app routes + configured product bases for the LLM. */
export function buildPlatformNavigationPromptBlock(): string {
  const lines: string[] = [
    'Plattform-Navigation (kanonisch):',
    'Nutze nur diese Pfade bzw. Links aus Seiten-/Projektkontext, Tool-Ergebnissen oder generierten UI-Linkblöcken. Erfinde keine URLs, IDs oder Deep-Links.',
    '',
    'PLEXON (relativ zur App):',
    `- Home: ${PATH_HOME}`,
    `- Collections: ${PATH_PROJECTS}`,
    `- Collection-Dashboard: ${pathPlatformProjectDashboard(PLATFORM_PROJECT_ID_PLACEHOLDER)}`,
    `- Collection-Flows: ${pathPlatformProjectFlows(PLATFORM_PROJECT_ID_PLACEHOLDER)}`,
    `- Event Quick Check: ${PATH_EVENT_QUICK_CHECK}`,
    `- Event Quick Check Run: ${pathEventQuickCheckRun(WORKFLOW_RUN_ID_PLACEHOLDER)}`,
    `- Assistent (Expand): ${PATH_ASSISTANT}`,
    `- Assistent Conversation: ${pathAssistantChat(CONVERSATION_ID_PLACEHOLDER)}`,
    `- Einstellungen: ${PATH_SETTINGS}`,
    `- Produkte: ${PATH_PRODUCTS}`,
  ]

  const productBases: string[] = []
  const checkion = trimOrigin(getCheckionUrl())
  const audion = trimOrigin(getAudionAdminUrl())
  const brandion = trimOrigin(getBrandionUrl())
  if (checkion) productBases.push(`- CHECKION Basis: ${checkion}`)
  if (audion) productBases.push(`- AUDION Admin Basis: ${audion}`)
  if (brandion) productBases.push(`- BRANDION Basis: ${brandion}`)

  if (productBases.length > 0) {
    lines.push('', 'Produkt-Apps (konfigurierte Origins — Deep-Links nur mit bekannten IDs/Launch-Helfern):')
    lines.push(...productBases)
  }

  lines.push(
    '',
    'Platzhalter ({platformProjectId}, {workflowRunId}, {conversationId}) nur ersetzen, wenn die ID aus Kontext oder Tools bekannt ist.'
  )

  return truncateAssistantText(lines.join('\n'), ASSISTANT_MAX_PLATFORM_NAV_CHARS, 'Navigation')
}
