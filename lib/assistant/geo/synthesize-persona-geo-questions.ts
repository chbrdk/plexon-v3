import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { getAssistantCompletionModel } from '@/lib/constants';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export const PERSONA_GEO_QUESTION_MAX_LENGTH = 180;

const BANNED_QUESTION_PATTERNS = [
  /\bbranche\s*:/i,
  /\bzielgruppe\s*:/i,
  /\bbezug\s*:/i,
  /\bsegment\s*:/i,
  /\bcontext\s*:/i,
];

const SYSTEM_PROMPT = `Du formulierst authentische Fragen auf Deutsch, die eine konkrete Buyer-Persona an eine KI stellen würde (z. B. ChatGPT), um Anbieter zu recherchieren oder zu vergleichen.

Regeln:
- Schreibe wie eine echte Person: Ich-Form oder natürliche Such-/Chatfrage
- Nutze Rolle, Ziele und Pain Points der Persona — nicht generische SEO-Keywords
- Beziehe dich auf das Angebot des bewerteten Unternehmens (nicht auf zufällige Website-Themen)
- KEINE Meta-Labels oder Anhänge wie "Branche:", "Zielgruppe:", "Bezug:"
- KEINE Keyword-Stapel oder Agentur-Jargon
- Maximal 160 Zeichen pro Frage
- Mindestens eine Frage nennt das bewertete Unternehmen
- Mindestens eine Frage fragt nach Alternativen oder einem Vergleich

Antworte NUR mit gültigem JSON: { "questions": ["...", "..."] }`;

export function isNaturalPersonaGeoQuestion(text: string): boolean {
  const q = text.trim();
  if (!q || q.length > PERSONA_GEO_QUESTION_MAX_LENGTH) return false;
  return !BANNED_QUESTION_PATTERNS.some((pattern) => pattern.test(q));
}

export function sanitizePersonaGeoQuestions(questions: string[], count: number): string[] {
  const unique: string[] = [];
  for (const raw of questions) {
    const q = raw.trim().replace(/\s+/g, ' ');
    if (!isNaturalPersonaGeoQuestion(q)) continue;
    if (unique.some((existing) => existing.toLowerCase() === q.toLowerCase())) continue;
    unique.push(q);
    if (unique.length >= count) break;
  }
  return unique;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

export function buildPersonaGeoQuestionContext(input: {
  url: string;
  persona: NonNullable<PersonaBootstrapPreview['persona']>;
  companyBrief?: EventQuickCheckCompanyBrief;
  checkionQueryHints?: string[];
  checkionCompetitors?: string[];
}): string {
  const brand = input.companyBrief?.displayName?.trim() || hostFromUrl(input.url);
  const profile = input.persona.profile;
  const lines = [
    `Bewertetes Unternehmen: ${brand}`,
    `Website: ${input.url}`,
    input.companyBrief?.industry ? `Angebot: ${input.companyBrief.industry}` : null,
    input.companyBrief?.summary ? `Kurzprofil: ${input.companyBrief.summary}` : null,
    '',
    `Persona: ${input.persona.name}`,
    `Rolle/Segment: ${input.persona.segment}`,
    `Headline: ${input.persona.headline}`,
    profile?.bio ? `Bio: ${profile.bio}` : null,
    profile?.goals?.length ? `Ziele: ${profile.goals.join('; ')}` : null,
    profile?.painPoints?.length ? `Pain Points: ${profile.painPoints.join('; ')}` : null,
    profile?.interests?.length ? `Interessen: ${profile.interests.join('; ')}` : null,
    input.companyBrief?.targetAudienceHint
      ? `Einkäufer-Kontext: ${input.companyBrief.targetAudienceHint}`
      : null,
    input.checkionCompetitors?.length
      ? `Bekannte Wettbewerber-Domains (optional einbeziehen): ${input.checkionCompetitors.join(', ')}`
      : null,
    input.checkionQueryHints?.length
      ? `\nDiese automatischen SEO-Vorschläge sind oft themenfremd — NICHT übernehmen, nur als Negativbeispiel:\n${input.checkionQueryHints.map((q) => `- ${q}`).join('\n')}`
      : null,
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildCompanyBriefGeoQuestionContext(input: {
  url: string;
  companyBrief: EventQuickCheckCompanyBrief;
  checkionQueryHints?: string[];
  checkionCompetitors?: string[];
}): string {
  const brand = input.companyBrief.displayName.trim() || hostFromUrl(input.url);
  const lines = [
    `Bewertetes Unternehmen: ${brand}`,
    `Website: ${input.url}`,
    `Angebot: ${input.companyBrief.industry}`,
    `Kurzprofil: ${input.companyBrief.summary}`,
    `Typische Käufer: ${input.companyBrief.targetAudienceHint}`,
    input.checkionCompetitors?.length
      ? `Bekannte Wettbewerber-Domains: ${input.checkionCompetitors.join(', ')}`
      : null,
    input.checkionQueryHints?.length
      ? `\nSEO-Vorschläge (nicht kopieren): ${input.checkionQueryHints.join(' | ')}`
      : null,
  ];
  return lines.filter(Boolean).join('\n');
}

async function callLlm(userContent: string, count: number): Promise<string[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getAssistantCompletionModel(),
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${userContent}\n\nFormuliere genau ${count} Fragen.`,
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!text) return null;

  try {
    const jsonText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonText) as { questions?: unknown };
    if (!Array.isArray(parsed.questions)) return null;
    return parsed.questions.map((q) => String(q).trim()).filter(Boolean);
  } catch {
    return null;
  }
}

export async function synthesizePersonaGeoQuestions(input: {
  url: string;
  persona: NonNullable<PersonaBootstrapPreview['persona']>;
  companyBrief?: EventQuickCheckCompanyBrief;
  count: number;
  checkionQueryHints?: string[];
  checkionCompetitors?: string[];
}): Promise<string[] | null> {
  const context = buildPersonaGeoQuestionContext(input);
  const raw = await callLlm(context, input.count);
  if (!raw?.length) return null;
  const sanitized = sanitizePersonaGeoQuestions(raw, input.count);
  return sanitized.length >= 1 ? sanitized : null;
}

export async function synthesizeCompanyBriefGeoQuestions(input: {
  url: string;
  companyBrief: EventQuickCheckCompanyBrief;
  count: number;
  checkionQueryHints?: string[];
  checkionCompetitors?: string[];
}): Promise<string[] | null> {
  const context = buildCompanyBriefGeoQuestionContext(input);
  const raw = await callLlm(context, input.count);
  if (!raw?.length) return null;
  const sanitized = sanitizePersonaGeoQuestions(raw, input.count);
  return sanitized.length >= 1 ? sanitized : null;
}
