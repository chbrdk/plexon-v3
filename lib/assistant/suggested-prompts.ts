/** Suggested quick prompts for the assistant composer (i18n keys). */

import {
  ASSISTANT_PROMPT_URL_PLACEHOLDER,
  personalizeAssistantPrompt,
} from '@/lib/assistant/project-target-url';

import { QUICK_CHECK_LABEL, QUICK_CHECK_PROMPT_EN } from '@/lib/assistant/event-quick-check/quick-check-label';
import { PATH_EVENT_QUICK_CHECK } from '@/lib/paths/event-quick-check-page';

export { ASSISTANT_PROMPT_URL_PLACEHOLDER };

export const ASSISTANT_SUGGESTED_PROMPT_TEMPLATES = [
  { id: 'website-audit', labelKey: 'assistant.suggestions.websiteAudit', prompt: 'Website audit https://example.com' },
  { id: 'launch-readiness', labelKey: 'assistant.suggestions.launchReadiness', prompt: 'Launch readiness für "Acme" https://example.com' },
  {
    id: 'event-quick-check',
    labelKey: 'assistant.suggestions.eventQuickCheck',
    prompt: QUICK_CHECK_PROMPT_EN,
    hrefPath: PATH_EVENT_QUICK_CHECK,
  },
  { id: 'domain-scan', labelKey: 'assistant.suggestions.domainScan', prompt: 'Deep scan https://example.com' },
  { id: 'ssl', labelKey: 'assistant.suggestions.ssl', prompt: 'SSL Check für https://example.com' },
  { id: 'scan', labelKey: 'assistant.suggestions.scan', prompt: 'Scanne https://example.com auf Accessibility-Probleme' },
  { id: 'pagespeed', labelKey: 'assistant.suggestions.pagespeed', prompt: 'Wie ist der PageSpeed von https://example.com?' },
  { id: 'geo', labelKey: 'assistant.suggestions.geo', prompt: 'GEO Analyse für https://example.com' },
  { id: 'wayback', labelKey: 'assistant.suggestions.wayback', prompt: 'Wayback Historie für https://example.com' },
  { id: 'readability', labelKey: 'assistant.suggestions.readability', prompt: 'Lesbarkeit https://example.com' },
  { id: 'audion-project', labelKey: 'assistant.suggestions.audionProject', prompt: 'Lege ein neues Projekt nur in AUDION an' },
  { id: 'checkion-project', labelKey: 'assistant.suggestions.checkionProject', prompt: 'Lege ein neues Projekt nur in CHECKION an' },
  { id: 'status', labelKey: 'assistant.suggestions.status', prompt: 'Zeig mir den Projektstatus' },
  { id: 'sync', labelKey: 'assistant.suggestions.sync', prompt: 'Sync-Diagnose: warum schlägt AUDION Sync fehl?' },
] as const;

/** @deprecated use ASSISTANT_SUGGESTED_PROMPT_TEMPLATES */
export const ASSISTANT_SUGGESTED_PROMPTS = ASSISTANT_SUGGESTED_PROMPT_TEMPLATES;

export type AssistantSuggestedPrompt = {
  id: string;
  labelKey: string;
  prompt: string;
  /** When set, chip navigates to this path instead of filling the composer. */
  hrefPath?: string;
};

export function buildAssistantSuggestedPrompts(options?: {
  domain?: string | null;
  projectName?: string | null;
}): AssistantSuggestedPrompt[] {
  return ASSISTANT_SUGGESTED_PROMPT_TEMPLATES.map((item) => ({
    ...item,
    prompt: personalizeAssistantPrompt(item.prompt, {
      url: options?.domain,
      projectName: options?.projectName,
    }),
  }));
}

export const ASSISTANT_SUGGESTION_LABELS_DE: Record<string, string> = {
  'assistant.suggestions.audionProject': 'Projekt in AUDION',
  'assistant.suggestions.checkionProject': 'Projekt in CHECKION',
  'assistant.suggestions.scan': 'URL scannen',
  'assistant.suggestions.pagespeed': 'PageSpeed',
  'assistant.suggestions.ssl': 'SSL-Check',
  'assistant.suggestions.wayback': 'Wayback',
  'assistant.suggestions.geo': 'GEO / E-E-A-T',
  'assistant.suggestions.domainScan': 'Domain Deep Scan',
  'assistant.suggestions.websiteAudit': 'Website-Audit',
  'assistant.suggestions.launchReadiness': 'Launch Readiness',
  'assistant.suggestions.eventQuickCheck': QUICK_CHECK_LABEL,
  'assistant.suggestions.readability': 'Lesbarkeit',
  'assistant.suggestions.status': 'Projektstatus',
  'assistant.suggestions.sync': 'Sync-Diagnose',
};

export const ASSISTANT_SUGGESTION_LABELS_EN: Record<string, string> = {
  'assistant.suggestions.audionProject': 'AUDION project',
  'assistant.suggestions.checkionProject': 'CHECKION project',
  'assistant.suggestions.scan': 'Scan URL',
  'assistant.suggestions.pagespeed': 'PageSpeed',
  'assistant.suggestions.ssl': 'SSL check',
  'assistant.suggestions.wayback': 'Wayback',
  'assistant.suggestions.geo': 'GEO / E-E-A-T',
  'assistant.suggestions.domainScan': 'Domain deep scan',
  'assistant.suggestions.websiteAudit': 'Website audit',
  'assistant.suggestions.launchReadiness': 'Launch readiness',
  'assistant.suggestions.eventQuickCheck': 'Quick check',
  'assistant.suggestions.readability': 'Readability',
  'assistant.suggestions.status': 'Project status',
  'assistant.suggestions.sync': 'Sync diagnose',
};
