import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import { getAssistantCompletionModel } from '@/lib/constants';
import { uiLayoutToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { parseInsightNarrativeJson } from '@/lib/assistant/insights/parse-insight-narrative';
import type {
  CrossSignal,
  EnrichWorkflowInput,
  WorkflowInsightNarrative,
} from '@/lib/assistant/insights/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Du bist Senior-Analyst für Web, SEO/GEO, Accessibility und digitale Strategie.
Du erhältst Messdaten (als Text), deterministische Signale und optionalen Projektkontext.
Schreibe eine valide, datenbasierte Einschätzung auf Deutsch — keine Halluzinationen, keine erfundenen Zahlen.
Nutze nur Fakten aus den Daten/Signalen. Wenn etwas fehlt, sage es explizit.
Antworte NUR mit gültigem JSON (kein Markdown-Codefence):
{
  "assessment": "string — 4-8 Sätze Gesamtbewertung mit Einordnung",
  "fazit": "string — 2-4 Sätze klares Fazit",
  "fazitTone": "success | warning | info | neutral | error",
  "highlights": [{ "label": "string", "value": "string|number", "unit": "optional", "tone": "success|warning|info|neutral|error" }],
  "findings": [{ "title": "string", "description": "string", "severity": "success|warning|error|info|neutral" }],
  "recommendations": [{ "title": "string", "description": "string", "priority": 1-5, "category": "SEO|GEO|A11y|Performance|Strategie" }],
  "crossComparisons": ["string — konkreter Quervergleich mit Zahlen aus den Signalen"]
}`;

export function narrativeFromCrossSignals(
  signals: CrossSignal[],
  workflowLabel: string
): WorkflowInsightNarrative {
  const worst = signals.find((s) => s.severity === 'error') ?? signals.find((s) => s.severity === 'warning');
  return {
    assessment: signals.length
      ? `Die ${workflowLabel}-Analyse liefert ${signals.length} bewertbare Signale. ${signals.map((s) => s.fact).join(' ')}`
      : `Für ${workflowLabel} liegen Messdaten vor; eine vertiefte Einordnung erfordert mehr Kontext.`,
    fazit: worst
      ? `Priorität: ${worst.title} — ${worst.fact}`
      : 'Die Messwerte liegen im erwartbaren Rahmen; gezielte Optimierung der schwächsten Bereiche empfiehlt sich.',
    fazitTone: worst?.severity ?? 'info',
    highlights: signals.slice(0, 4).map((s) => ({
      label: s.title,
      value: s.category,
      tone: s.severity,
    })),
    findings: signals.slice(0, 6).map((s) => ({
      title: s.title,
      description: s.fact,
      severity: s.severity,
    })),
    recommendations: worst
      ? [
          {
            title: `Maßnahme zu: ${worst.title}`,
            description: 'Schwachstelle aus den Messdaten priorisiert angehen und nach 2–4 Wochen erneut messen.',
            priority: 1,
            category: worst.category,
          },
        ]
      : [],
    crossComparisons: signals.filter((s) => s.category === 'Quervergleich').map((s) => s.fact),
  };
}

export async function generateWorkflowInsights(options: {
  apiKey?: string;
  workflowLabel: string;
  input: EnrichWorkflowInput;
}): Promise<WorkflowInsightNarrative> {
  const fallback = narrativeFromCrossSignals(options.input.crossSignals, options.workflowLabel);
  const dataText = uiLayoutToPlainText(options.input.dataLayout).slice(0, 10_000);
  const signalsText = options.input.crossSignals
    .map((s) => `- [${s.severity}] ${s.category} / ${s.title}: ${s.fact}`)
    .join('\n');
  const benchmarkNote = options.input.crossBenchmarks?.fetchNote
    ? `\nHinweis Quer-Benchmark: ${options.input.crossBenchmarks.fetchNote}`
    : '';

  const userPrompt = [
    `Workflow: ${options.workflowLabel}`,
    options.input.projectContext ? `Projektkontext:\n${options.input.projectContext.slice(0, 6000)}` : null,
    'Deterministische Signale:',
    signalsText || '(keine)',
    benchmarkNote || null,
    'Messdaten (UI-Auszug):',
    dataText,
  ]
    .filter(Boolean)
    .join('\n\n');

  const apiKey = options.apiKey?.trim();
  if (!apiKey) return fallback;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: getAssistantCompletionModel(),
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) return fallback;

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
    const parsed = parseInsightNarrativeJson(text, fallback);
    if (parsed.findings.length === 0 && fallback.findings.length > 0) {
      return { ...parsed, findings: fallback.findings };
    }
    if (parsed.crossComparisons?.length === 0 && fallback.crossComparisons?.length) {
      return { ...parsed, crossComparisons: fallback.crossComparisons };
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export function workflowLabelForType(workflowType: string): string {
  const labels: Record<string, string> = {
    geo_analysis: 'GEO / E-E-A-T',
    quick_scan: 'Accessibility-Scan',
    pagespeed_check: 'PageSpeed',
    domain_scan: 'Domain Deep Scan',
    ssl_check: 'SSL-Check',
    readability_check: 'Lesbarkeit',
    website_audit: 'Website-Audit',
    launch_readiness: 'Launch Readiness',
    event_quick_check: QUICK_CHECK_LABEL,
  };
  return labels[workflowType] ?? workflowType;
}

export function emptyLayout(): import('@/lib/assistant/ui-blocks/types').UiLayout {
  return { version: UI_LAYOUT_VERSION, blocks: [] };
}
