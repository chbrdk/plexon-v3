import type { ConversationMessageWithMeta } from '@/lib/assistant/conversation-context';
import type { ConversationRecommendation } from '@/lib/assistant/insights/follow-up-suggestions';
import {
  ASSISTANT_PROMPT_URL_PLACEHOLDER,
  resolveAssistantTargetUrl,
} from '@/lib/assistant/project-target-url';

const PROMPT_ALREADY = {
  geo: /\b(geo|e-?e-?a-?t)\b/i,
  pagespeed: /\b(pagespeed|performance|lighthouse)\b/i,
  scan: /\b(scan|wcag|accessibility|barrierefrei)/i,
  audit: /\b(website\s*audit|vollständige\s*analyse|launch\s*readiness)\b/i,
  domain: /\b(domain|deep)\s*scan\b/i,
  status: /\b(projekt\s*status|zusammenfassung|übersicht)\b/i,
};

function recentUserPromptText(history: ConversationMessageWithMeta[], prompt: string): string {
  const parts = [prompt];
  for (let i = history.length - 1; i >= 0 && parts.length < 4; i--) {
    if (history[i]?.role === 'user') parts.push(history[i].content);
  }
  return parts.join('\n');
}

function pushIfNotCovered(
  out: ConversationRecommendation[],
  seen: Set<string>,
  recentText: string,
  pattern: RegExp,
  item: ConversationRecommendation
): void {
  if (pattern.test(recentText)) return;
  if (seen.has(item.id) || out.length >= 5) return;
  seen.add(item.id);
  out.push(item);
}

/** Recommendations to keep the conversation going (free chat & fallbacks). */
export function buildContextualRecommendations(options: {
  prompt: string;
  history: ConversationMessageWithMeta[];
  url?: string;
  platformProjectId?: string;
  plannerIntent?: string;
}): ConversationRecommendation[] {
  const out: ConversationRecommendation[] = [];
  const seen = new Set<string>();
  const recentText = recentUserPromptText(options.history, options.prompt);
  const url = options.url?.trim();

  if (url) {
    pushIfNotCovered(out, seen, recentText, PROMPT_ALREADY.geo, {
      id: 'ctx-geo',
      label: 'GEO / E-E-A-T',
      prompt: `GEO Analyse für ${url}`,
      reason: 'AI-Sichtbarkeit und Trust-Signale vertiefen',
    });
    pushIfNotCovered(out, seen, recentText, PROMPT_ALREADY.pagespeed, {
      id: 'ctx-pagespeed',
      label: 'SEO & PageSpeed',
      prompt: `Wie ist der PageSpeed von ${url}?`,
      reason: 'Technisches SEO und Performance ergänzen',
    });
    pushIfNotCovered(out, seen, recentText, PROMPT_ALREADY.scan, {
      id: 'ctx-scan',
      label: 'Accessibility-Scan',
      prompt: `Scanne ${url} auf Accessibility-Probleme`,
      reason: 'WCAG-Probleme neben SEO/GEO betrachten',
    });
    pushIfNotCovered(out, seen, recentText, PROMPT_ALREADY.audit, {
      id: 'ctx-audit',
      label: 'Website-Audit',
      prompt: `Website audit ${url}`,
      reason: 'Alle Bereiche in einem Durchlauf',
    });
    pushIfNotCovered(out, seen, recentText, PROMPT_ALREADY.domain, {
      id: 'ctx-domain',
      label: 'Domain Deep Scan',
      prompt: `Deep scan ${url}`,
      reason: 'Gesamte Domain statt nur einer URL',
    });
  }

  if (options.platformProjectId) {
    pushIfNotCovered(out, seen, recentText, PROMPT_ALREADY.status, {
      id: 'ctx-status',
      label: 'Projektstatus',
      prompt: 'Zeig mir den Projektstatus',
      reason: 'Fortschritt in CHECKION & AUDION',
    });
  }

  const intent = options.plannerIntent ?? '';
  if (intent.includes('persona') && url) {
    if (!seen.has('ctx-geo-after-persona') && out.length < 5) {
      seen.add('ctx-geo-after-persona');
      out.push({
        id: 'ctx-geo-after-persona',
        label: 'GEO für Zielgruppe',
        prompt: `GEO Analyse für ${url}`,
        reason: 'Persona-Wissen mit Sichtbarkeit verbinden',
      });
    }
  }

  return out.slice(0, 5);
}

export function buildDefaultConversationStarters(options: {
  platformProjectId?: string;
  url?: string;
}): ConversationRecommendation[] {
  const url = options.url?.trim();

  if (options.platformProjectId) {
    const starters: ConversationRecommendation[] = [
      {
        id: 'default-status',
        label: 'Projektstatus',
        prompt: 'Zeig mir den Projektstatus',
        reason: 'Überblick über CHECKION & AUDION',
      },
    ];
    if (url) {
      starters.push(
        {
          id: 'default-geo',
          label: 'GEO / E-E-A-T',
          prompt: `GEO Analyse für ${url}`,
          reason: 'AI-Sichtbarkeit für die Projekt-Domain',
        },
        {
          id: 'default-pagespeed',
          label: 'SEO & PageSpeed',
          prompt: `Wie ist der PageSpeed von ${url}?`,
          reason: 'Performance der Projekt-Domain prüfen',
        }
      );
    }
    starters.push({
      id: 'default-capabilities',
      label: 'Was kannst du?',
      prompt: 'Was kannst du?',
      reason: 'Alle Assistenten-Funktionen',
    });
    return starters.slice(0, 5);
  }

  if (url) {
    return [
      {
        id: 'default-audit',
        label: 'Website-Audit',
        prompt: `Website audit ${url}`,
        reason: 'Schneller Einstieg mit der bekannten Domain',
      },
      {
        id: 'default-capabilities',
        label: 'Was kannst du?',
        prompt: 'Was kannst du?',
        reason: 'Funktionen entdecken',
      },
    ];
  }

  return [
    {
      id: 'default-audit',
      label: 'Website-Audit',
      prompt: `Website audit ${ASSISTANT_PROMPT_URL_PLACEHOLDER}`,
      reason: 'Schneller Einstieg — URL im Prompt anpassen',
    },
    {
      id: 'default-capabilities',
      label: 'Was kannst du?',
      prompt: 'Was kannst du?',
      reason: 'Funktionen entdecken',
    },
  ];
}

export function resolveConversationUrl(
  history: ConversationMessageWithMeta[],
  prompt: string,
  uiLayout?: unknown,
  projectDomain?: string | null
): string | undefined {
  return resolveAssistantTargetUrl({
    uiLayout,
    history,
    prompt,
    projectDomain,
  });
}
