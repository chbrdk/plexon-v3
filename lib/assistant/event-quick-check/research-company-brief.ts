import {
  EVENT_QUICK_CHECK_COMPANY_BRIEF_DISAMBIGUATION_DE,
  type EventQuickCheckCompanyBrief,
} from '@/lib/assistant/event-quick-check/company-brief-types';
import { extractHomepageSignals } from '@/lib/assistant/event-quick-check/extract-homepage-signals';
import { getAssistantCompletionModel } from '@/lib/constants';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Du erstellst ein kurzes Unternehmensprofil für einen Marketing-Quick-Check.
Nutze NUR die gelieferten Website-Signale. Erfinde keine Fakten.
Wenn der Firmenname ein Beruf oder Alltagswort sein könnte (z. B. Schreiner, Bauer, Fischer), 
kläre aus dem Website-Kontext, was das Unternehmen WIRKLICH macht — die spätere Persona ist 
die KÄUFER-/NUTZER-Zielgruppe, nicht der Beruf im Namen.

Antworte NUR mit gültigem JSON:
{
  "displayName": "string — Anzeigename des Unternehmens",
  "industry": "string — Branche / Was sie anbieten (kurz)",
  "summary": "string — 2-4 Sätze Was das Unternehmen macht",
  "targetAudienceHint": "string — Wer typische Käufer/Nutzer sind (B2B/B2C, Rolle)",
  "disambiguationNote": "string — optional, Warnung wenn Name irreführend"
}`;

type LlmBrief = {
  displayName?: string;
  industry?: string;
  summary?: string;
  targetAudienceHint?: string;
  disambiguationNote?: string;
};

function fallbackBrief(
  projectName: string,
  signals: Awaited<ReturnType<typeof extractHomepageSignals>>
): EventQuickCheckCompanyBrief {
  const displayName =
    signals.ogTitle?.trim() ||
    signals.pageTitle?.trim()?.split(/[|\-–—]/)[0]?.trim() ||
    projectName;
  const summary =
    signals.metaDescription?.trim() ||
    signals.ogDescription?.trim() ||
    (signals.h1[0]
      ? `${displayName}: ${signals.h1[0]}`
      : `Unternehmen unter ${signals.domain} — bitte Profil prüfen und ergänzen.`);
  const industry = signals.h1[0]?.slice(0, 120) || 'Bitte Branche prüfen';
  const targetAudienceHint =
    'Typische Entscheider und Nutzer der angebotenen Leistungen (bitte im nächsten Schritt präzisieren).';

  return buildCompanyBrief({
    displayName,
    industry,
    summary,
    targetAudienceHint,
    disambiguationNote: EVENT_QUICK_CHECK_COMPANY_BRIEF_DISAMBIGUATION_DE,
    signals,
  });
}

function buildCompanyBrief(input: {
  displayName: string;
  industry: string;
  summary: string;
  targetAudienceHint: string;
  disambiguationNote: string;
  signals: Awaited<ReturnType<typeof extractHomepageSignals>>;
}): EventQuickCheckCompanyBrief {
  const companyContext = [
    `Unternehmen: ${input.displayName}`,
    `Website: ${input.signals.url}`,
    `Domain: ${input.signals.domain}`,
    `Branche: ${input.industry}`,
    '',
    input.summary,
    '',
    `Zielgruppen-Fokus: ${input.targetAudienceHint}`,
    '',
    input.disambiguationNote,
  ].join('\n');

  return {
    displayName: input.displayName,
    industry: input.industry,
    summary: input.summary,
    targetAudienceHint: input.targetAudienceHint,
    disambiguationNote: input.disambiguationNote,
    companyContext,
    sources: input.signals,
    generatedAt: new Date().toISOString(),
  };
}

async function synthesizeWithLlm(
  projectName: string,
  signals: Awaited<ReturnType<typeof extractHomepageSignals>>
): Promise<EventQuickCheckCompanyBrief | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const excerpt = [
    `Vorgeschlagener Projektname: ${projectName}`,
    `URL: ${signals.url}`,
    signals.pageTitle ? `Title: ${signals.pageTitle}` : null,
    signals.metaDescription ? `Meta: ${signals.metaDescription}` : null,
    signals.ogTitle ? `OG Title: ${signals.ogTitle}` : null,
    signals.ogDescription ? `OG Description: ${signals.ogDescription}` : null,
    signals.h1.length ? `H1: ${signals.h1.join(' | ')}` : null,
    signals.fetchError ? `Fetch-Hinweis: ${signals.fetchError}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getAssistantCompletionModel(),
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: excerpt }],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!text) return null;

  let parsed: LlmBrief;
  try {
    const jsonText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(jsonText) as LlmBrief;
  } catch {
    return null;
  }

  const displayName = parsed.displayName?.trim() || projectName;
  const summary = parsed.summary?.trim();
  if (!summary) return null;

  return buildCompanyBrief({
    displayName,
    industry: parsed.industry?.trim() || 'Nicht angegeben',
    summary,
    targetAudienceHint:
      parsed.targetAudienceHint?.trim() ||
      'Entscheider und Fachnutzer im relevanten Marktsegment',
    disambiguationNote:
      parsed.disambiguationNote?.trim() || EVENT_QUICK_CHECK_COMPANY_BRIEF_DISAMBIGUATION_DE,
    signals,
  });
}

export async function researchCompanyBrief(input: {
  url: string;
  projectName: string;
}): Promise<EventQuickCheckCompanyBrief> {
  const signals = await extractHomepageSignals(input.url);
  const llm = await synthesizeWithLlm(input.projectName.trim() || signals.domain, signals);
  return llm ?? fallbackBrief(input.projectName.trim() || signals.domain, signals);
}

/** Merge user edits from confirmation form into a validated brief. */
export function applyCompanyBriefEdits(
  base: EventQuickCheckCompanyBrief,
  edits: {
    displayName?: string;
    industry?: string;
    summary?: string;
    targetAudienceHint?: string;
    disambiguationNote?: string;
  }
): EventQuickCheckCompanyBrief {
  return buildCompanyBrief({
    displayName: edits.displayName?.trim() || base.displayName,
    industry: edits.industry?.trim() || base.industry,
    summary: edits.summary?.trim() || base.summary,
    targetAudienceHint: edits.targetAudienceHint?.trim() || base.targetAudienceHint,
    disambiguationNote: edits.disambiguationNote?.trim() || base.disambiguationNote,
    signals: base.sources,
  });
}
