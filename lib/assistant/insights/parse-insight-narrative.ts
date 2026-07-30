import type { UiTone } from '@/lib/assistant/ui-blocks/types';
import type {
  WorkflowInsightFinding,
  WorkflowInsightHighlight,
  WorkflowInsightNarrative,
  WorkflowInsightRecommendation,
} from '@/lib/assistant/insights/types';

const UI_TONES = new Set<UiTone>(['neutral', 'success', 'warning', 'error', 'info']);

function parseTone(value: unknown, fallback: UiTone = 'info'): UiTone {
  return typeof value === 'string' && UI_TONES.has(value as UiTone) ? (value as UiTone) : fallback;
}

function normalizeRecommendations(raw: unknown): WorkflowInsightRecommendation[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkflowInsightRecommendation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    if (!title) continue;
    out.push({
      title,
      description: typeof rec.description === 'string' ? rec.description.trim() : '',
      priority:
        typeof rec.priority === 'number' && rec.priority >= 1 && rec.priority <= 5
          ? Math.round(rec.priority)
          : undefined,
      category: typeof rec.category === 'string' ? rec.category.trim() : undefined,
    });
  }
  return out;
}

function normalizeFindings(raw: unknown): WorkflowInsightFinding[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkflowInsightFinding[] = [];
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

function normalizeHighlights(raw: unknown): WorkflowInsightHighlight[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkflowInsightHighlight[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const h = item as Record<string, unknown>;
    const label = typeof h.label === 'string' ? h.label.trim() : '';
    if (!label) continue;
    out.push({
      label,
      value: typeof h.value === 'string' || typeof h.value === 'number' ? h.value : String(h.value ?? '—'),
      unit: typeof h.unit === 'string' ? h.unit.trim() : undefined,
      tone: parseTone(h.tone, 'neutral'),
    });
  }
  return out;
}

function normalizeCrossComparisons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, 6);
}

export function parseInsightNarrativeJson(raw: string, fallback: WorkflowInsightNarrative): WorkflowInsightNarrative {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) return fallback;
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
    return {
      assessment:
        typeof parsed.assessment === 'string' && parsed.assessment.trim()
          ? parsed.assessment.trim()
          : fallback.assessment,
      fazit: typeof parsed.fazit === 'string' && parsed.fazit.trim() ? parsed.fazit.trim() : fallback.fazit,
      fazitTone: parseTone(parsed.fazitTone, fallback.fazitTone ?? 'info'),
      highlights: normalizeHighlights(parsed.highlights),
      findings: normalizeFindings(parsed.findings),
      recommendations: normalizeRecommendations(parsed.recommendations),
      crossComparisons: normalizeCrossComparisons(parsed.crossComparisons),
    };
  } catch {
    return fallback;
  }
}
