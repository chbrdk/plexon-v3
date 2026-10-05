/**
 * Compact help corpus for Assistant system prompt (Wave 1 RAG-lite).
 * Spec: specs/domain/suite-help-docs.md
 */

import { listHelpArticles } from '@/lib/help/content'
import { pathHelpArticle, PATH_DOCS_PUBLIC, PATH_HELP } from '@/lib/paths/help'
import {
  ASSISTANT_MAX_PLATFORM_NAV_CHARS,
  truncateAssistantText,
} from '@/lib/assistant/context-budget'
import type { HelpAccessLevel } from '@/lib/help/types'

const HELP_CORPUS_MAX = Math.min(ASSISTANT_MAX_PLATFORM_NAV_CHARS, 2400)

export function buildHelpCorpusPromptBlock(access: HelpAccessLevel = 'authenticated'): string {
  const articles = listHelpArticles({ locale: 'de', access })
  const lines: string[] = [
    'Suite Docs & Help (kanonische Artikel — kein paralleles Wissenssilo):',
    `- Öffentliche Docs: ${PATH_DOCS_PUBLIC}`,
    `- Auth-Hilfe: ${PATH_HELP}`,
    'Wenn der Nutzer How-to-Hilfe braucht: passenden Artikel nennen und den Pfad angeben.',
    'Zum Öffnen im Produkt: Link `/help/{id}` oder dem Nutzer sagen, Help (`?`) zu öffnen.',
    'Artikel-Inventar:',
  ]
  for (const article of articles.slice(0, 24)) {
    const hints = (article.assistantHints ?? []).slice(0, 2).join('; ')
    lines.push(
      `- ${article.id} · ${article.titleLocalized} · ${pathHelpArticle(article.id)}${
        hints ? ` · Hinweise: ${hints}` : ''
      }`,
    )
  }
  return truncateAssistantText(lines.join('\n'), HELP_CORPUS_MAX, 'HelpCorpus')
}

export function buildAskAssistantDraft(articleId: string, title?: string): string {
  const label = title?.trim() || articleId
  return `Ich brauche Hilfe zum Artikel „${label}“ (${articleId} / ${pathHelpArticle(articleId)}). Bitte erkläre die Schritte im Kontext meiner aktuellen Seite und Collection.`
}
