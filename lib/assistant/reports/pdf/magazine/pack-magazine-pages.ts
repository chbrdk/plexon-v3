/**
 * Estimate EQC magazine chapter mass and pack consecutive chapters onto pages.
 * Units are abstract (≈ % of one A4 content column). Leave breathing room —
 * better one short page than a squeezed spread.
 */

import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { resolveReportPersonas } from '@/lib/assistant/reports/resolve-report-personas'

/** Full page budget in abstract units. */
export const MAG_PACK_BUDGET = 100
/** Leave unused so packed pages stay airy. */
export const MAG_PACK_BREATHING = 12
/** Cost of the hairline between stacked chapters. */
export const MAG_PACK_DIVIDER = 8
/** Cap modules per sheet even if weights would allow more. */
export const MAG_PACK_MAX_PER_PAGE = 3

function chars(text: string | undefined | null): number {
  return text?.trim().length ?? 0
}

function proseUnits(text: string | undefined | null, perLine = 72): number {
  const n = chars(text)
  if (!n) return 0
  return Math.max(4, Math.ceil(n / perLine) * 2.2)
}

function listUnits(count: number, perItem = 4.5, base = 6): number {
  if (count <= 0) return 0
  return base + count * perItem
}

function promptCount(report: EventQuickCheckReportModel): number {
  const byModel = report.geo.citationHighlightsByModel
  if (byModel?.length) {
    const queries = new Set<string>()
    for (const slice of byModel) {
      for (const run of slice.runs ?? []) queries.add(run.query)
    }
    if (queries.size) return Math.min(8, queries.size)
  }
  return Math.min(8, report.geo.questions.length)
}

/**
 * Approximate vertical mass for one chapter (0–100+).
 * Values ≥ (BUDGET - BREATHING) force a solo page.
 */
export function estimateEqcChapterWeight(
  key: string,
  report: EventQuickCheckReportModel,
): number {
  switch (key) {
    case 'cover': {
      let w = 48
      w += proseUnits(report.executive.fazit, 64)
      w += Math.min(4, report.executive.kpiTiles.length) * 10
      return Math.min(110, w)
    }
    case 'market': {
      if (!report.market) return 0
      let w = 22
      w += proseUnits(report.market.executiveSummary)
      w += listUnits(report.market.keyFindings.length, 3.5, 4)
      w += proseUnits(report.market.implications, 80) * 0.6
      // two-column spread compresses height
      if (report.market.executiveSummary && report.market.keyFindings.length) {
        w *= 0.72
      }
      return Math.round(w)
    }
    case 'domain': {
      if (!report.domain) return 0
      let w = 28
      w += listUnits(Math.min(8, report.domain.topIssues.length), 4, 4)
      if (report.domain.topIssues.length) w *= 0.7
      return Math.round(w)
    }
    case 'distributions': {
      if (!report.distributions) return 0
      let cols = 0
      if (report.distributions.readability?.bands.length) cols += 1
      if (report.distributions.eco?.grades.length) cols += 1
      if (report.distributions.links?.slices.length) cols += 1
      // Donuts sit in one row — height ≈ chapter chrome + one visual band, not cols×full.
      return cols === 0 ? 0 : Math.round(26 + 16 + Math.max(0, cols - 1) * 3)
    }
    case 'domain-comparison': {
      const rows = report.domainComparison?.rows.length ?? 0
      return 20 + listUnits(rows, 3.5, 4)
    }
    case 'persona': {
      const personas = resolveReportPersonas(report)
      if (!personas.length) return 0
      if (personas.length === 1) {
        const p = personas[0]!
        return Math.round(
          26 +
            proseUnits(p.bio || p.headline, 70) * 0.7 +
            listUnits(Math.min(6, p.traits.length), 2.5, 3) +
            listUnits(Math.min(6, p.goals.length), 3, 3) +
            listUnits(Math.min(6, p.painPoints.length), 3, 3),
        )
      }
      const rows = Math.ceil(personas.length / 2)
      return Math.round(22 + rows * 36)
    }
    case 'geo': {
      let w = 26
      if (report.geo.overallScore != null) w += 8
      if (report.geo.geoFitnessScore != null) w += 8
      const comps = Math.min(8, report.geo.competitors.length)
      const prompts = promptCount(report)
      w += listUnits(comps, 4, 4)
      w += listUnits(prompts, 4, 4)
      if (comps > 0 && prompts > 0) w *= 0.68
      return Math.round(w)
    }
    case 'eeat': {
      const dims = report.geo.eeatDimensions.length
      const gaps = report.geo.eeatMissingElements?.length ?? 0
      let w = 22
      w += proseUnits(report.geo.geoFitnessReasoning, 70)
      w += listUnits(dims, 7, 4)
      w += listUnits(gaps, 3.5, 4)
      return Math.round(w)
    }
    case 'geo-recs': {
      const n = Math.min(10, report.geo.recommendations.length)
      return Math.round(20 + listUnits(n, 5.5, 4) * 0.75)
    }
    case 'insights': {
      if (!report.insights) return 0
      let w = 20
      w += proseUnits(report.insights.fazit || report.insights.assessment, 64)
      w += listUnits(Math.min(10, report.insights.findings.length), 5, 4) * 0.75
      return Math.round(w)
    }
    case 'appendix': {
      const rows = report.appendix.stepTable.rows.length
      const links = report.appendix.links.length
      return Math.round(18 + listUnits(rows, 3.2, 3) + listUnits(links, 2.5, 2))
    }
    default:
      return 40
  }
}

function forcesSolo(key: string, weight: number): boolean {
  if (key === 'cover') return true
  return weight >= MAG_PACK_BUDGET - MAG_PACK_BREATHING
}

/**
 * Greedy pack of consecutive chapter keys into page groups.
 * Never reorders chapters. Leaves breathing capacity unused.
 */
export function packEqcMagazinePages(
  chapterKeys: string[],
  report: EventQuickCheckReportModel,
): string[][] {
  const pages: string[][] = []
  let current: string[] = []
  let used = 0
  const softCap = MAG_PACK_BUDGET - MAG_PACK_BREATHING

  const flush = () => {
    if (current.length) {
      pages.push(current)
      current = []
      used = 0
    }
  }

  for (const key of chapterKeys) {
    const weight = estimateEqcChapterWeight(key, report)
    if (weight <= 0) continue

    if (forcesSolo(key, weight)) {
      flush()
      pages.push([key])
      continue
    }

    const nextCost = current.length === 0 ? weight : weight + MAG_PACK_DIVIDER
    const wouldExceed = used + nextCost > softCap
    const wouldOverflowCount = current.length >= MAG_PACK_MAX_PER_PAGE

    if (current.length > 0 && (wouldExceed || wouldOverflowCount)) {
      flush()
    }

    if (current.length === 0) {
      current = [key]
      used = weight
    } else {
      current.push(key)
      used += weight + MAG_PACK_DIVIDER
    }
  }

  flush()
  return pages
}
