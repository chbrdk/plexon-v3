import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { getAssistantCompletionModel } from '@/lib/constants';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export type BuyerSegmentDraft = {
  name: string;
  segment: string;
  description: string;
  personaDescription: string;
};

const SYSTEM_PROMPT = `Du leitest aus einem Unternehmensprofil unterschiedlich viele Buyer-Segmente für B2B/B2C-Personas ab.
Jedes Segment = eine eigene Zielgruppe mit anderer Rolle (z. B. Entscheider, Fachanwender, IT/Procurement).
Die Personas sind KÄUFER/NUTZER — nicht der Beruf im Firmennamen.
Erstelle genau die im User-Prompt genannte Anzahl an Segmenten.

Antworte NUR mit gültigem JSON:
{
  "segments": [
    {
      "name": "Kurzer Zielgruppen-Name (max 80 Zeichen)",
      "segment": "Rolle/Segment-Label",
      "description": "1-2 Sätze wer diese Zielgruppe ist",
      "personaDescription": "2-3 Sätze Kontext für Persona-Generierung (Ziele, Situation)"
    }
  ]
}`;

type LlmSegments = {
  segments?: Array<{
    name?: string;
    segment?: string;
    description?: string;
    personaDescription?: string;
  }>;
};

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Rule-based buyer segments when LLM is unavailable. */
export function fallbackBuyerSegments(
  brief: EventQuickCheckCompanyBrief,
  count: number
): BuyerSegmentDraft[] {
  const industry = brief.industry.trim() || brief.displayName;
  const base = brief.targetAudienceHint.trim() || 'typische Käufer und Nutzer';
  const summary = brief.summary.trim();

  const templates: BuyerSegmentDraft[] = [
    {
      name: clip(`Entscheider — ${industry}`, 120),
      segment: 'Geschäftsführung / Einkaufsleitung',
      description: clip(
        `Budgetverantwortliche Entscheider für ${industry}. ${base}`,
        500
      ),
      personaDescription: clip(
        [
          `Senior Buyer-Persona für ${brief.displayName}.`,
          summary,
          `Rolle: budgetverantwortlicher Entscheider im Bereich ${industry}.`,
          brief.disambiguationNote,
        ].join(' '),
        2000
      ),
    },
    {
      name: clip(`Fachanwender — ${industry}`, 120),
      segment: 'Fachanwender / operative Nutzer',
      description: clip(
        `Operative Nutzer, die ${brief.displayName} täglich einsetzen würden. ${base}`,
        500
      ),
      personaDescription: clip(
        [
          `Operative Persona für ${brief.displayName}.`,
          summary,
          `Täglicher Nutzer der Lösung im Bereich ${industry}.`,
          brief.disambiguationNote,
        ].join(' '),
        2000
      ),
    },
    {
      name: clip(`Technische Evaluation — ${industry}`, 120),
      segment: 'IT / Technik / Procurement',
      description: clip(
        `Technische oder beschaffungsseitige Evaluatoren für ${industry}. ${base}`,
        500
      ),
      personaDescription: clip(
        [
          `Technische Buyer-Persona für ${brief.displayName}.`,
          summary,
          `Vergleicht Anbieter, Integration und Total Cost of Ownership.`,
          brief.disambiguationNote,
        ].join(' '),
        2000
      ),
    },
  ];

  return templates.slice(0, Math.max(1, count));
}

async function synthesizeSegmentsWithLlm(
  brief: EventQuickCheckCompanyBrief,
  count: number
): Promise<BuyerSegmentDraft[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const userContent = [
    `Unternehmen: ${brief.displayName}`,
    `Branche: ${brief.industry}`,
    `Profil: ${brief.summary}`,
    `Zielgruppen-Hinweis: ${brief.targetAudienceHint}`,
    brief.disambiguationNote ? `Hinweis: ${brief.disambiguationNote}` : null,
    '',
    `Erstelle genau ${count} unterschiedliche Buyer-Segmente.`,
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: getAssistantCompletionModel(),
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!text) return null;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as LlmSegments;
    const segments = (parsed.segments ?? [])
      .map((s) => ({
        name: clip(s.name?.trim() || 'Zielgruppe', 120),
        segment: clip(s.segment?.trim() || s.name?.trim() || 'Segment', 120),
        description: clip(s.description?.trim() || brief.targetAudienceHint, 500),
        personaDescription: clip(
          s.personaDescription?.trim() ||
            `${brief.summary} ${brief.disambiguationNote}`.trim(),
          2000
        ),
      }))
      .filter((s) => s.name && s.personaDescription);

    return segments.length >= count ? segments.slice(0, count) : null;
  } catch {
    return null;
  }
}

/** Derive distinct buyer segments from a confirmed company brief. */
export async function deriveBuyerSegments(
  brief: EventQuickCheckCompanyBrief,
  count: number
): Promise<BuyerSegmentDraft[]> {
  const safeCount = Math.max(1, Math.min(count, 5));
  const llm = await synthesizeSegmentsWithLlm(brief, safeCount);
  if (llm?.length) return llm;
  return fallbackBuyerSegments(brief, safeCount);
}
