/**
 * Act-apply helpers — map Jev Choice/Noul onto heuristic baselines.
 * Spec: specs/domain/jev-decisions.md § Act-apply
 */
import type { AssistantIntent } from '@/lib/assistant/intent-router'
import {
  extractContrastHexPair,
  extractScanIdFromText,
  extractUrlFromText,
} from '@/lib/assistant/conversation-context'
import { ASSISTANT_INTENT_OPTIONS } from '@/lib/jev/catalog'
import { extractScopedProjectName } from '@/lib/assistant/create-project-scope'
import { EVENT_QUICK_CHECK_PLAYBOOK_ID } from '@/lib/paths/assistant-workflows'

const INTENT_OPTION_SET = new Set<string>(ASSISTANT_INTENT_OPTIONS)

function extractDomain(text: string): string | undefined {
  const m = text.match(
    /\b(?:domain|für|for)\s+([a-z0-9][a-z0-9.-]+\.[a-z]{2,})\b/i,
  )
  return m?.[1]?.trim()
}

/**
 * Build a structured intent from a Jev choice key + prompt extractors.
 * Returns null when required params are missing → caller keeps baseline.
 */
export function materializeAssistantIntent(
  prompt: string,
  jevKey: string,
): AssistantIntent | null {
  const trimmed = prompt.trim()
  const url = extractUrlFromText(trimmed)
  const domain = extractDomain(trimmed)
  const urlOrHost = url ?? (domain ? `https://${domain}` : undefined)

  switch (jevKey) {
    case 'free_chat':
      return { type: 'free_chat' }
    case 'capabilities':
      return { type: 'capabilities' }
    case 'ui_showcase':
      return { type: 'ui_showcase' }
    case 'sync_diagnose':
      return { type: 'sync_diagnose' }
    case 'project_status':
      return { type: 'project_status' }
    case 'start_research':
      return { type: 'start_research' }
    case 'campaign_brief_list':
      return { type: 'campaign_brief_list' }
    case 'campaign_brief_create':
      return { type: 'campaign_brief_create' }
    case 'scan_summarize':
      return { type: 'scan_summarize', scanId: extractScanIdFromText(trimmed) }
    case 'create_project':
      return {
        type: 'create_project',
        name: extractScopedProjectName(trimmed),
        domain,
      }
    case 'quick_scan':
      return urlOrHost ? { type: 'quick_scan', url: urlOrHost } : null
    case 'pagespeed_check':
      return urlOrHost ? { type: 'pagespeed_check', url: urlOrHost } : null
    case 'domain_scan':
      return urlOrHost ? { type: 'domain_scan', url: urlOrHost } : null
    case 'readability_check':
      return urlOrHost ? { type: 'readability_check', url: urlOrHost } : null
    case 'geo_analysis':
      return urlOrHost
        ? {
            type: 'geo_analysis',
            url: urlOrHost,
            deep: /\bdeep\b|\bvollständig\b/i.test(trimmed),
          }
        : null
    case 'ssl_check':
      return urlOrHost ? { type: 'ssl_check', host: urlOrHost } : null
    case 'wayback_check':
      return urlOrHost ? { type: 'wayback_check', url: urlOrHost } : null
    case 'contrast_check': {
      const colors = extractContrastHexPair(trimmed)
      return colors
        ? {
            type: 'contrast_check',
            foreground: colors.foreground,
            background: colors.background,
          }
        : null
    }
    case 'persona_bootstrap':
      return {
        type: 'persona_bootstrap',
        name: extractScopedProjectName(trimmed),
        targetGroupName: extractScopedProjectName(trimmed),
      }
    case 'persona_page_relevance':
      return {
        type: 'persona_page_relevance',
        urlHint: url ?? undefined,
      }
    case 'journey_outline':
      return { type: 'journey_outline' }
    case 'journey_generate':
      return { type: 'journey_generate' }
    case 'run_playbook':
      // Playbook id is not in the Choice set — only keep if baseline already had one via caller.
      return urlOrHost
        ? {
            type: 'run_playbook',
            playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
            url: urlOrHost,
          }
        : null
    case 'run_collection_flow':
      return { type: 'run_collection_flow' }
    case 'promote_capability_sequence':
      return { type: 'promote_capability_sequence' }
    default:
      return null
  }
}

export function applyAssistantIntentAct(
  prompt: string,
  baseline: AssistantIntent,
  jevKey: unknown,
): { intent: AssistantIntent; applied: boolean } {
  if (typeof jevKey !== 'string' || !jevKey || jevKey === 'other') {
    return { intent: baseline, applied: false }
  }
  if (!INTENT_OPTION_SET.has(jevKey)) {
    return { intent: baseline, applied: false }
  }
  if (jevKey === baseline.type) {
    return { intent: baseline, applied: false }
  }
  const built = materializeAssistantIntent(prompt, jevKey)
  if (!built) return { intent: baseline, applied: false }
  // When Jev rematerializes run_playbook over a different baseline type, keep
  // baseline playbookId if the baseline was already run_playbook (defensive).
  if (
    built.type === 'run_playbook' &&
    baseline.type === 'run_playbook' &&
    baseline.playbookId
  ) {
    return {
      intent: { ...built, playbookId: baseline.playbookId },
      applied: true,
    }
  }
  return { intent: built, applied: true }
}

export type PlannerJevBucket =
  | 'general_chat'
  | 'creation_scene_edit'
  | 'geo_analysis'
  | 'event_quick_check'
  | 'other'

export function parsePlannerJevBucket(raw: unknown): PlannerJevBucket | null {
  if (typeof raw !== 'string') return null
  if (
    raw === 'general_chat' ||
    raw === 'creation_scene_edit' ||
    raw === 'geo_analysis' ||
    raw === 'event_quick_check' ||
    raw === 'other'
  ) {
    return raw
  }
  return null
}

export function logJevAct(payload: {
  useCaseId: string
  baseline: unknown
  jev: unknown
  applied: boolean
  latencyMs: number | null
}): void {
  try {
    console.info('[jev-act]', JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}
