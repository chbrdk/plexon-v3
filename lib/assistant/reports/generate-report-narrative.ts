import { getAssistantCompletionModel } from '@/lib/constants';
import { uiLayoutToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text';
import type { UiBlock, UiTone } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type {
  ReportFinding,
  ReportHighlight,
  ReportNarrative,
  ReportRecommendation,
} from '@/lib/assistant/reports/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Du bist ein Analyst für digitale Projekte (Web, SEO/GEO, Accessibility, Personas).
Du erhältst strukturierte Auszüge aus einem Assistenten-Chat und schreibst einen kuratierten Report auf Deutsch.
Antworte NUR mit gültigem JSON (kein Markdown-Codefence), Schema:
{
  "title": "string — prägnanter Report-Titel",
  "intro": "string — 2-4 Sätze Kontext",
  "executiveSummary": "string — 3-6 Sätze Kernerkenntnisse",
  "fazit": "string — 2-4 Sätze abschließende Bewertung",
  "fazitTone": "success | warning | info | neutral",
  "highlights": [{ "label": "string", "value": "string|number", "unit": "optional", "tone": "success|warning|info|neutral" }],
  "findings": [{ "title": "string", "description": "string", "severity": "success|warning|error|info|neutral" }],
  "recommendations": [{ "title": "string", "description": "string", "priority": 1-5, "category": "optional z.B. SEO|A11y|GEO" }]
}`;

const UI_TONES = new Set<UiTone>(['neutral', 'success', 'warning', 'error', 'info']);

function parseTone(value: unknown, fallback: UiTone = 'info'): UiTone {
  return typeof value === 'string' && UI_TONES.has(value as UiTone) ? (value as UiTone) : fallback;
}

function normalizeRecommendations(raw: unknown): ReportRecommendation[] {
  if (!Array.isArray(raw)) return [];
  const out: ReportRecommendation[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ title: item.trim(), description: '' });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    if (!title) continue;
    const priority =
      typeof rec.priority === 'number' && rec.priority >= 1 && rec.priority <= 5
        ? Math.round(rec.priority)
        : undefined;
    out.push({
      title,
      description: typeof rec.description === 'string' ? rec.description.trim() : '',
      priority,
      category: typeof rec.category === 'string' ? rec.category.trim() : undefined,
    });
  }
  return out;
}

function normalizeFindings(raw: unknown): ReportFinding[] {
  if (!Array.isArray(raw)) return [];
  const out: ReportFinding[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const f = item as Record<string, unknown>;
    const title = typeof f.title === 'string' ? f.title.trim() : '';
    const description = typeof f.description === 'string' ? f.description.trim() : '';
    if (!title || !description) continue;
    out.push({
      title,
      description,
      severity: parseTone(f.severity, 'info'),
    });
  }
  return out;
}

function normalizeHighlights(raw: unknown): ReportHighlight[] {
  if (!Array.isArray(raw)) return [];
  const out: ReportHighlight[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const h = item as Record<string, unknown>;
    const label = typeof h.label === 'string' ? h.label.trim() : '';
    if (!label) continue;
    const value =
      typeof h.value === 'string' || typeof h.value === 'number' ? h.value : String(h.value ?? '—');
    out.push({
      label,
      value,
      unit: typeof h.unit === 'string' ? h.unit.trim() : undefined,
      tone: parseTone(h.tone, 'neutral'),
    });
  }
  return out;
}

function fallbackNarrative(blocks: UiBlock[], titleHint?: string): ReportNarrative {
  const title = titleHint?.trim() || 'Kuratierter Assistenten-Report';
  return {
    title,
    intro: 'Dieser Report fasst die vom Nutzer ausgewählten Ergebnisse aus der Assistenten-Session zusammen.',
    executiveSummary:
      blocks.length > 0
        ? `Der Report enthält ${blocks.length} ausgewählte Abschnitte mit den wichtigsten Daten aus dem Chat.`
        : 'Es wurden keine Inhalte ausgewählt.',
    fazit: 'Die ausgewählten Ergebnisse bilden die Grundlage für die nächsten Schritte im Projekt.',
    fazitTone: 'success',
    findings: [],
    recommendations: [],
  };
}

function parseNarrativeJson(raw: string, fallback: ReportNarrative): ReportNarrative {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) return fallback;
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Partial<ReportNarrative> & {
      recommendations?: unknown;
      findings?: unknown;
      highlights?: unknown;
    };
    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallback.title,
      intro: typeof parsed.intro === 'string' ? parsed.intro.trim() : fallback.intro,
      executiveSummary:
        typeof parsed.executiveSummary === 'string' ? parsed.executiveSummary.trim() : fallback.executiveSummary,
      fazit: typeof parsed.fazit === 'string' ? parsed.fazit.trim() : fallback.fazit,
      fazitTone: parseTone(parsed.fazitTone, fallback.fazitTone ?? 'success'),
      highlights: normalizeHighlights(parsed.highlights),
      findings: normalizeFindings(parsed.findings),
      recommendations: normalizeRecommendations(parsed.recommendations),
    };
  } catch {
    return fallback;
  }
}

export async function generateReportNarrative(options: {
  apiKey: string;
  pinnedBlocks: UiBlock[];
  titleHint?: string;
  conversationTitle?: string | null;
}): Promise<ReportNarrative> {
  const fallback = fallbackNarrative(options.pinnedBlocks, options.titleHint);
  if (options.pinnedBlocks.length === 0) return fallback;

  const contentText = uiLayoutToPlainText({ version: UI_LAYOUT_VERSION, blocks: options.pinnedBlocks });
  const userPrompt = [
    options.conversationTitle ? `Chat-Titel: ${options.conversationTitle}` : null,
    options.titleHint ? `Gewünschter Titel: ${options.titleHint}` : null,
    'Ausgewählte Inhalte:',
    contentText.slice(0, 12000),
  ]
    .filter(Boolean)
    .join('\n\n');

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getAssistantCompletionModel(),
      max_tokens: 3072,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    return fallback;
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
  return parseNarrativeJson(text, fallback);
}
