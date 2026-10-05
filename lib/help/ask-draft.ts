/**
 * Client-safe Ask-Assistant draft helper (no node:fs).
 * Spec: specs/domain/suite-help-docs.md
 */

import { pathHelpArticle } from '@/lib/paths/help'

export function buildAskAssistantDraft(articleId: string, title?: string): string {
  const label = title?.trim() || articleId
  return `Ich brauche Hilfe zum Artikel „${label}“ (${articleId} / ${pathHelpArticle(articleId)}). Bitte erkläre die Schritte im Kontext meiner aktuellen Seite und Collection.`
}
