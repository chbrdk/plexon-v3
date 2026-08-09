import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label'
import { getAssistantCompletionModel } from '@/lib/constants'
import { uiLayoutToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text'
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types'
import { parseInsightNarrativeJson } from '@/lib/assistant/insights/parse-insight-narrative'
import {
  filterEqcMetaFindings,
  findingsFromInsightSignals,
  insightEligibleSignals,
} from '@/lib/assistant/insights/eqc-insight-quality'
import type {
  CrossSignal,
  EnrichWorkflowInput,
  WorkflowInsightNarrative,
  WorkflowInsightSource,
} from '@/lib/assistant/insights/types'
import type { EventQuickCheckResult as EqcResult } from '@/lib/assistant/playbooks/run-event-quick-check'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

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
}`

const EQC_SYSTEM_PROMPT = `Du bist Senior-Strateg:in für generative Suche (GEO), Wettbewerb und Buyer-Personas.
Du bewertest einen Event Quick Check (Domain-Scan + Persona + GEO-Zitationen).

Findings müssen ECHTE Erkenntnisse sein — keine Pipeline-Statusmeldungen.
VERBOTEN als Finding-Titel oder -Inhalt:
- „Persona wurde erstellt“, „AUDION Persona …“, reine Trait-Listen („Top-Traits“)
- „wir haben N Fragen gestellt“, reine Fragezählung, „GEO-Fragen“ als Status
- Wiederholung von UI-Labels ohne Interpretation

GEFORDERT (4–7 Findings):
- Lücke vs. Wettbewerb / Share of Voice / Zitierposition mit Zahlen
- Persona-Bedarf (Ziele/Pains) vs. was Modelle tatsächlich zitieren oder belohnen
- E-E-A-T-Schwachstelle → konkrete Content-/Trust-Implikation
- Domain-Qualität vs. GEO-Sichtbarkeit (wenn beide Scores vorliegen)

Empfehlungen: priorisiert, actionable, Kategorie SEO|GEO|A11y|Performance|Strategie.
Nur Fakten aus den Daten — keine erfundenen Zahlen.
Antworte NUR mit gültigem JSON (Schema wie üblich: assessment, fazit, fazitTone, highlights, findings, recommendations, crossComparisons).`

export function narrativeFromCrossSignals(
  signals: CrossSignal[],
  workflowLabel: string,
): WorkflowInsightNarrative {
  const eligible = insightEligibleSignals(signals)
  const forFindings = eligible.length > 0 ? eligible : signals
  const worst =
    forFindings.find((s) => s.severity === 'error') ??
    forFindings.find((s) => s.severity === 'warning')
  return {
    assessment: forFindings.length
      ? [
          `Die ${workflowLabel}-Analyse liefert ${forFindings.length} bewertbare Signale.`,
          ...forFindings.slice(0, 2).map((s) => s.fact),
        ].join(' ')
      : `Für ${workflowLabel} liegen Messdaten vor; eine vertiefte Einordnung erfordert mehr Kontext.`,
    fazit: worst
      ? `Priorität: ${worst.title} — ${worst.fact}`
      : 'Die Messwerte liegen im erwartbaren Rahmen; gezielte Optimierung der schwächsten Bereiche empfiehlt sich.',
    fazitTone: worst?.severity ?? 'info',
    highlights: forFindings.slice(0, 4).map((s) => ({
      label: s.title,
      value: s.category,
      tone: s.severity,
    })),
    findings: findingsFromInsightSignals(forFindings.length ? forFindings : signals),
    recommendations: worst
      ? [
          {
            title: `Maßnahme zu: ${worst.title}`,
            description:
              'Schwachstelle aus den Messdaten priorisiert angehen und nach 2–4 Wochen erneut messen.',
            priority: 1,
            category: worst.category,
          },
        ]
      : [],
    crossComparisons: forFindings
      .filter((s) => s.category === 'Quervergleich')
      .map((s) => s.fact),
  }
}

/** Deterministic EQC fallback — insight-eligible signals only. */
export function narrativeFromEqcCrossSignals(
  signals: CrossSignal[],
  workflowLabel: string,
): WorkflowInsightNarrative {
  const base = narrativeFromCrossSignals(signals, workflowLabel)
  return {
    ...base,
    findings: filterEqcMetaFindings(base.findings),
    assessment: insightEligibleSignals(signals).length
      ? base.assessment
      : `Für ${workflowLabel} liegen Persona-/GEO-Kontextdaten vor, aber noch zu wenige vergleichende Messsignale für eine belastbare Einschätzung.`,
  }
}

export function buildEqcInsightSnapshot(quick: EqcResult): string {
  const lines: string[] = []
  if (quick.domainScan) {
    lines.push(
      `Domain-Scan: Score ${quick.domainScan.score}/100, ${quick.domainScan.totalPages ?? '?'} Seiten, Top-Issues: ${(quick.domainScan.topIssues ?? []).slice(0, 3).map((i) => i.title).join(', ') || '—'}`,
    )
  }
  if (quick.geoJob) {
    lines.push(
      `GEO: overall ${quick.geoJob.overallScore ?? '—'}/100, Fitness ${quick.geoJob.geoFitnessScore ?? '—'}/100`,
    )
    const comps = (quick.geoJob.competitors ?? []).slice(0, 5)
    if (comps.length) {
      lines.push(
        `Wettbewerber: ${comps
          .map((c) => {
            const sov =
              typeof c.shareOfVoice === 'number'
                ? c.shareOfVoice <= 1
                  ? Math.round(c.shareOfVoice * 100)
                  : Math.round(c.shareOfVoice)
                : null
            return `${c.name} (score ${c.score ?? '—'}${sov != null ? `, SoV ${sov}%` : ''})`
          })
          .join('; ')}`,
      )
    }
    const eeat = quick.geoJob.eeatScores
    if (eeat) {
      lines.push(
        `E-E-A-T: Trust ${eeat.trust?.score ?? '—'}, Exp ${eeat.experience?.score ?? '—'}, Expertise ${eeat.expertise?.score ?? '—'}, Auth ${eeat.authoritativeness?.score ?? '—'}`,
      )
    }
    if (quick.geoJob.missingGeoElements?.length) {
      lines.push(`GEO-Lücken: ${quick.geoJob.missingGeoElements.slice(0, 6).join(', ')}`)
    }
  }
  const persona = quick.personaPreview?.persona
  if (persona) {
    lines.push(
      `Persona (Kontext): ${persona.name} · ${persona.segment} · Confidence ${Math.round(persona.confidence * 100)}%`,
    )
    if (persona.profile?.goals?.length) {
      lines.push(`Ziele: ${persona.profile.goals.slice(0, 4).join(' | ')}`)
    }
    if (persona.profile?.painPoints?.length) {
      lines.push(`Schmerzpunkte: ${persona.profile.painPoints.slice(0, 4).join(' | ')}`)
    }
  }
  if (quick.geoQuestions?.length) {
    lines.push(
      `Beispiel-Prompts (Kontext, nicht als Finding): ${quick.geoQuestions.slice(0, 3).join(' | ')}`,
    )
  }
  return lines.join('\n')
}

function isEqcSource(
  source: WorkflowInsightSource,
): source is { workflowType: 'event_quick_check'; url: string; quick: EqcResult } {
  return source.workflowType === 'event_quick_check'
}

export async function generateWorkflowInsights(options: {
  apiKey?: string
  workflowLabel: string
  input: EnrichWorkflowInput
}): Promise<WorkflowInsightNarrative> {
  const isEqc = isEqcSource(options.input.source)
  const fallback = isEqc
    ? narrativeFromEqcCrossSignals(options.input.crossSignals, options.workflowLabel)
    : narrativeFromCrossSignals(options.input.crossSignals, options.workflowLabel)

  const dataText = uiLayoutToPlainText(options.input.dataLayout).slice(0, 10_000)
  const signalsText = options.input.crossSignals
    .map((s) => {
      const tag = s.role === 'context' ? 'KONTEXT' : 'SIGNAL'
      return `- [${tag}/${s.severity}] ${s.category} / ${s.title}: ${s.fact}`
    })
    .join('\n')
  const benchmarkNote = options.input.crossBenchmarks?.fetchNote
    ? `\nHinweis Quer-Benchmark: ${options.input.crossBenchmarks.fetchNote}`
    : ''

  const eqcSnapshot =
    isEqc && options.input.source.workflowType === 'event_quick_check'
      ? buildEqcInsightSnapshot(options.input.source.quick)
      : null

  const userPrompt = [
    `Workflow: ${options.workflowLabel}`,
    options.input.projectContext
      ? `Projektkontext:\n${options.input.projectContext.slice(0, 6000)}`
      : null,
    eqcSnapshot ? `Quick-Check-Snapshot:\n${eqcSnapshot}` : null,
    'Deterministische Signale (KONTEXT = nur Hintergrund, nicht als Finding wiederholen):',
    signalsText || '(keine)',
    benchmarkNote || null,
    'Messdaten (UI-Auszug):',
    dataText,
  ]
    .filter(Boolean)
    .join('\n\n')

  const apiKey = options.apiKey?.trim()
  if (!apiKey) return fallback

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
        system: isEqc ? EQC_SYSTEM_PROMPT : SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) return fallback

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
    const parsed = parseInsightNarrativeJson(text, fallback)

    let findings = isEqc ? filterEqcMetaFindings(parsed.findings) : parsed.findings
    if (findings.length === 0 && fallback.findings.length > 0) {
      findings = isEqc ? filterEqcMetaFindings(fallback.findings) : fallback.findings
    }

    const crossComparisons =
      parsed.crossComparisons?.length
        ? parsed.crossComparisons
        : fallback.crossComparisons

    return {
      ...parsed,
      findings,
      crossComparisons,
    }
  } catch {
    return fallback
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
  }
  return labels[workflowType] ?? workflowType
}

export function emptyLayout(): import('@/lib/assistant/ui-blocks/types').UiLayout {
  return { version: UI_LAYOUT_VERSION, blocks: [] }
}
