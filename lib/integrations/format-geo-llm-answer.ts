import type { EventQuickCheckReportCitationQueryRun } from '@/lib/assistant/reports/event-quick-check-report-types';
import { GEO_COMPETITIVE_ANSWER_TEXT_MAX } from '@/lib/integrations/geo-competitive-answer-limits';

type CitationLike = { domain: string; position: number; context?: string };

function clipAnswer(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length <= GEO_COMPETITIVE_ANSWER_TEXT_MAX) return trimmed;
    return `${trimmed.slice(0, GEO_COMPETITIVE_ANSWER_TEXT_MAX - 1).trimEnd()}…`;
}

function formatCitationsAsAnswer(citations: CitationLike[]): string {
    if (citations.length === 0) return '';
    return citations
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((c) => `${c.position}. ${c.domain}${c.context ? ` — ${c.context}` : ''}`)
        .join('\n');
}

function answerFromRawExcerpt(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
        const parsed = JSON.parse(trimmed) as { answer?: string; citations?: unknown };
        if (typeof parsed.answer === 'string' && parsed.answer.trim()) {
            return clipAnswer(parsed.answer);
        }
    } catch {
        /* legacy plain JSON citations only */
    }
    return '';
}

/** Resolve display text for the LLM answer dialog (new + legacy GEO runs). */
export function formatGeoLlmAnswerForDisplay(
    run: Pick<EventQuickCheckReportCitationQueryRun, 'answerText' | 'rawAnswerExcerpt' | 'citations'>
): string {
    if (run.answerText?.trim()) return clipAnswer(run.answerText);
    const fromRaw = run.rawAnswerExcerpt ? answerFromRawExcerpt(run.rawAnswerExcerpt) : '';
    if (fromRaw) return fromRaw;
    return formatCitationsAsAnswer(run.citations);
}

export function hasGeoLlmAnswerContent(
    run: Pick<EventQuickCheckReportCitationQueryRun, 'answerText' | 'rawAnswerExcerpt' | 'citations'>
): boolean {
    return formatGeoLlmAnswerForDisplay(run).length > 0;
}
