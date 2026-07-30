import type { CrossSignal, WorkflowInsightNarrative } from '@/lib/assistant/insights/types';

export type ConversationRecommendation = {
  id: string;
  label: string;
  prompt: string;
  reason?: string;
};

/** @deprecated use ConversationRecommendation */
export type WorkflowFollowUpPrompt = ConversationRecommendation;

export const MAX_CONVERSATION_RECOMMENDATIONS = 5;

const PLAYBOOK_TYPES = new Set(['website_audit', 'launch_readiness', 'event_quick_check']);

const SKIP_CONTINUATION: Record<string, Set<string>> = {
  geo_analysis: new Set(['geo', 'ctx-geo']),
  quick_scan: new Set(['quick-scan', 'ctx-scan']),
  pagespeed_check: new Set(['pagespeed', 'ctx-pagespeed']),
  domain_scan: new Set(['domain-scan', 'ctx-domain']),
  ssl_check: new Set(['ssl', 'ctx-ssl']),
  readability_check: new Set(['readability', 'ctx-readability']),
  website_audit: new Set(['website-audit', 'ctx-audit']),
  launch_readiness: new Set(['launch-readiness']),
  event_quick_check: new Set(['event-quick-check']),
};

function hasWeakSignals(signals: CrossSignal[]): boolean {
  return signals.some((s) => s.severity === 'error' || s.severity === 'warning');
}

function hasSignal(signals: CrossSignal[], idPrefix: string): boolean {
  return signals.some((s) => s.id.startsWith(idPrefix));
}

export function mergeRecommendations(
  base: ConversationRecommendation[],
  next: ConversationRecommendation[],
  seen: Set<string> = new Set(base.map((r) => r.id))
): ConversationRecommendation[] {
  const out = [...base];
  for (const item of next) {
    if (seen.has(item.id) || out.length >= MAX_CONVERSATION_RECOMMENDATIONS) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function pushUnique(
  out: ConversationRecommendation[],
  seen: Set<string>,
  item: ConversationRecommendation
): void {
  if (seen.has(item.id) || out.length >= MAX_CONVERSATION_RECOMMENDATIONS) return;
  seen.add(item.id);
  out.push(item);
}

/**
 * Complementary next analyses after a workflow — always offered (conversation continuation).
 */
export function buildWorkflowContinuationRecommendations(
  workflowType: string,
  url: string
): ConversationRecommendation[] {
  const trimmedUrl = url.trim();
  if (!trimmedUrl || PLAYBOOK_TYPES.has(workflowType)) return [];

  const out: ConversationRecommendation[] = [];
  const seen = new Set<string>();
  const skip = SKIP_CONTINUATION[workflowType] ?? new Set<string>();

  const add = (id: string, label: string, prompt: string, reason: string) => {
    if (skip.has(id)) return;
    pushUnique(out, seen, { id: `next-${id}`, label, prompt, reason });
  };

  switch (workflowType) {
    case 'geo_analysis':
      add(
        'pagespeed',
        'SEO & PageSpeed',
        `Wie ist der PageSpeed von ${trimmedUrl}?`,
        'Technisches SEO neben GEO/E-E-A-T betrachten'
      );
      add(
        'quick-scan',
        'Accessibility-Scan',
        `Scanne ${trimmedUrl} auf Accessibility-Probleme`,
        'UX- und WCAG-Signale ergänzen Trust-Bewertung'
      );
      add(
        'domain-scan',
        'Domain Deep Scan',
        `Deep scan ${trimmedUrl}`,
        'Issues domain-weit statt nur Startseite'
      );
      add(
        'website-audit',
        'Website-Audit',
        `Website audit ${trimmedUrl} ohne GEO`,
        'PageSpeed, A11y, SSL & Lesbarkeit in einem Report'
      );
      break;
    case 'quick_scan':
      add(
        'pagespeed',
        'SEO & PageSpeed',
        `Wie ist der PageSpeed von ${trimmedUrl}?`,
        'Performance und Lighthouse-SEO ergänzen'
      );
      add(
        'geo',
        'GEO / E-E-A-T',
        `GEO Analyse für ${trimmedUrl}`,
        'AI-Sichtbarkeit und Autoritätssignale'
      );
      add(
        'readability',
        'Lesbarkeit',
        `Lesbarkeit ${trimmedUrl}`,
        'Content-Schwere für Zielgruppen prüfen'
      );
      break;
    case 'pagespeed_check':
      add(
        'geo',
        'GEO / E-E-A-T',
        `GEO Analyse für ${trimmedUrl}`,
        'Lighthouse SEO ersetzt keine GEO-Bewertung'
      );
      add(
        'quick-scan',
        'WCAG-Scan',
        `Scanne ${trimmedUrl} auf Accessibility-Probleme`,
        'Tiefere Barrierefreiheit als Lighthouse A11y'
      );
      add(
        'domain-scan',
        'Domain Deep Scan',
        `Deep scan ${trimmedUrl}`,
        'Performance-Probleme auf der ganzen Domain'
      );
      break;
    case 'domain_scan':
      add(
        'geo',
        'GEO / E-E-A-T',
        `GEO Analyse für ${trimmedUrl}`,
        'Content-Trust und AI-Ranking ergänzen'
      );
      add(
        'pagespeed',
        'PageSpeed Startseite',
        `Wie ist der PageSpeed von ${trimmedUrl}?`,
        'Core Web Vitals der Einstiegs-URL'
      );
      add(
        'website-audit',
        'Website-Audit',
        `Website audit ${trimmedUrl}`,
        'Verdichteter Gesamt-Report'
      );
      break;
    case 'ssl_check': {
      const auditUrl = trimmedUrl.startsWith('http')
        ? trimmedUrl
        : `https://${trimmedUrl.replace(/^https?:\/\//, '')}`;
      add(
        'website-audit',
        'Website-Audit',
        `Website audit ${auditUrl}`,
        'TLS im Kontext von Performance & SEO'
      );
      add(
        'pagespeed',
        'PageSpeed',
        `Wie ist der PageSpeed von ${auditUrl}?`,
        'Performance nach TLS-Fix priorisieren'
      );
      break;
    }
    case 'readability_check':
      add(
        'geo',
        'GEO / E-E-A-T',
        `GEO Analyse für ${trimmedUrl}`,
        'Lesbarkeit und Trust für AI-Suche'
      );
      add(
        'quick-scan',
        'Accessibility-Scan',
        `Scanne ${trimmedUrl} auf Accessibility-Probleme`,
        'Struktur und A11y zum Text-Check'
      );
      break;
    default:
      break;
  }

  return out;
}

/** Gap-driven extras when insights show warnings/errors. */
function buildGapDrivenRecommendations(options: {
  workflowType: string;
  url: string;
  crossSignals: CrossSignal[];
}): ConversationRecommendation[] {
  const { workflowType, url, crossSignals } = options;
  const trimmedUrl = url.trim();
  if (!trimmedUrl || !hasWeakSignals(crossSignals)) return [];

  const out: ConversationRecommendation[] = [];
  const seen = new Set<string>();

  if (!PLAYBOOK_TYPES.has(workflowType)) {
    const skipGeo = workflowType === 'geo_analysis';
    pushUnique(out, seen, {
      id: 'gap-website-audit',
      label: 'Vollständiges Website-Audit',
      prompt: skipGeo
        ? `Website audit ${trimmedUrl} ohne GEO`
        : `Website audit ${trimmedUrl}`,
      reason: 'Mehrere Schwachstellen — verkettete Analyse',
    });
  }

  if (workflowType === 'geo_analysis' && hasSignal(crossSignals, 'geo-vs-market')) {
    pushUnique(out, seen, {
      id: 'gap-deep-scan',
      label: 'Domain Deep Scan',
      prompt: `Deep scan ${trimmedUrl}`,
      reason: 'Wettbewerbsrückstand — domain-weit optimieren',
    });
  }

  if (workflowType === 'quick_scan' && hasSignal(crossSignals, 'scan-errors')) {
    pushUnique(out, seen, {
      id: 'gap-audit',
      label: 'Website-Audit',
      prompt: `Website audit ${trimmedUrl}`,
      reason: 'Kritische WCAG-Fehler — Gesamtbild empfohlen',
    });
  }

  if (workflowType !== 'domain_scan' && crossSignals.some((s) => s.id === 'playbook-spread')) {
    pushUnique(out, seen, {
      id: 'gap-domain-scan',
      label: 'Domain Deep Scan',
      prompt: `Deep scan ${trimmedUrl}`,
      reason: 'Große Score-Unterschiede im Audit',
    });
  }

  return out;
}

/**
 * Workflow follow-ups: continuation (always) + gap-driven (when insights warn).
 */
export function buildWorkflowFollowUps(options: {
  workflowType: string;
  url: string;
  crossSignals: CrossSignal[];
  narrative?: WorkflowInsightNarrative;
}): ConversationRecommendation[] {
  const { workflowType, url, crossSignals } = options;
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return [];

  const continuation = buildWorkflowContinuationRecommendations(workflowType, trimmedUrl);
  const gaps = buildGapDrivenRecommendations({ workflowType, url: trimmedUrl, crossSignals });
  return mergeRecommendations(continuation, gaps).slice(0, MAX_CONVERSATION_RECOMMENDATIONS);
}

export function workflowSourceUrl(source: import('@/lib/assistant/insights/types').WorkflowInsightSource): string {
  switch (source.workflowType) {
    case 'ssl_check':
      return source.host.startsWith('http') ? source.host : `https://${source.host}`;
    default:
      return source.url;
  }
}
