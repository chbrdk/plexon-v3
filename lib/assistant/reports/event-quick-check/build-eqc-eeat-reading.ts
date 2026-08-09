import type { EventQuickCheckReportGeoEeatDimension } from '@/lib/assistant/reports/event-quick-check-report-types'

/** Magazine sentence when CHECKION did not attach per-dimension reasoning. */
export function buildEqcEeatReadingFallback(input: {
  dimensions: EventQuickCheckReportGeoEeatDimension[]
  missingElements?: string[]
  geoFitnessReasoning?: string
  weakest?: EventQuickCheckReportGeoEeatDimension
  strongest?: EventQuickCheckReportGeoEeatDimension
}): string {
  const missing = (input.missingElements ?? []).map((x) => x.trim()).filter(Boolean)
  if (input.geoFitnessReasoning?.trim()) {
    const gaps = missing.length ? ` Lücken: ${missing.slice(0, 4).join(', ')}.` : ''
    return `${input.geoFitnessReasoning.trim().replace(/\.$/, '')}.${gaps}`
  }
  if (missing.length) {
    return `On-Page fehlen vor allem ${missing.slice(0, 4).join(', ')} — das drückt die GEO-Fitness, auch wenn einzelne E-E-A-T-Werte höher liegen.`
  }
  if (input.weakest && input.strongest && input.weakest.key !== input.strongest.key) {
    return `${input.strongest.label} liegt bei ${input.strongest.score}, ${input.weakest.label} bei ${input.weakest.score} — Modelle sehen Substanz, aber ungleich verteilte Beweislast auf der Seite.`
  }
  if (input.dimensions.length) {
    const avg = Math.round(
      input.dimensions.reduce((n, d) => n + d.score, 0) / input.dimensions.length
    )
    return `E-E-A-T bewegt sich um ${avg}/100 — zitierbar, aber ohne klare On-Page-Begründung im Report.`
  }
  return ''
}
