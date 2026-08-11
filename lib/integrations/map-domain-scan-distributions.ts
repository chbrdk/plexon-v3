/** Slim corpus distribution payload for EQC magazine (from Checkion DomainOverview). */

export type DomainScanDistributionSlice = {
  id: string
  label: string
  value: number
}

/** Deutsche Donut-Labels (Checkion liefert EN-Ids). */
export const DIST_SLICE_LABEL_DE: Record<string, string> = {
  easy: 'Einfach',
  standard: 'Standard',
  complex: 'Komplex',
  very: 'Sehr komplex',
  internal: 'Intern',
  external: 'Extern',
  broken: 'Defekt',
}

const READABILITY_GRADE_DE: Record<string, string> = {
  Easy: 'Einfach',
  'Easy (6th Grade)': 'Einfach (6. Klasse)',
  Standard: 'Standard',
  'Standard (High School)': 'Standard (Sekundarstufe)',
  Complex: 'Komplex',
  'Complex (College)': 'Komplex (Hochschule)',
  'Very complex': 'Sehr komplex',
  'Very Complex': 'Sehr komplex',
  'Very Complex (Academic)': 'Sehr komplex (akademisch)',
}

export function localizeDistSliceLabel(id: string, fallback: string): string {
  return DIST_SLICE_LABEL_DE[id] ?? fallback
}

export function localizeReadabilityGrade(grade: string): string {
  return READABILITY_GRADE_DE[grade] ?? grade
}

export type DomainScanDistributions = {
  readability?: {
    bands: DomainScanDistributionSlice[]
    score?: number
    grade?: string
    dwellSecondsMedian?: number | null
  }
  eco?: {
    grades: DomainScanDistributionSlice[]
    grade?: string
    avgCo2?: number
  }
  links?: {
    slices: DomainScanDistributionSlice[]
    internal: number
    external: number
    broken: number
    total: number
  }
}

export function hasDomainScanDistributions(d?: DomainScanDistributions | null): boolean {
  if (!d) return false
  return Boolean(
    (d.readability?.bands.length ?? 0) > 0 ||
      (d.eco?.grades.length ?? 0) > 0 ||
      (d.links?.slices.length ?? 0) > 0,
  )
}

/** Map Checkion DomainOverview JSON → slim distributions for EQC. */
export function mapDomainOverviewToDistributions(overview: unknown): DomainScanDistributions | undefined {
  if (!overview || typeof overview !== 'object') return undefined
  const o = overview as Record<string, unknown>
  const ux = o.ux && typeof o.ux === 'object' ? (o.ux as Record<string, unknown>) : null
  const eco = o.eco && typeof o.eco === 'object' ? (o.eco as Record<string, unknown>) : null
  const links = o.links && typeof o.links === 'object' ? (o.links as Record<string, unknown>) : null

  const out: DomainScanDistributions = {}

  if (ux) {
    const bandsRaw = ux.readabilityBands
    if (bandsRaw && typeof bandsRaw === 'object') {
      const b = bandsRaw as Record<string, unknown>
      const bands: DomainScanDistributionSlice[] = [
        { id: 'easy', label: DIST_SLICE_LABEL_DE.easy, value: Number(b.easy ?? 0) || 0 },
        {
          id: 'standard',
          label: DIST_SLICE_LABEL_DE.standard,
          value: Number(b.standard ?? 0) || 0,
        },
        {
          id: 'complex',
          label: DIST_SLICE_LABEL_DE.complex,
          value: Number(b.complex ?? 0) || 0,
        },
        {
          id: 'very',
          label: DIST_SLICE_LABEL_DE.very,
          value: Number(b.veryComplex ?? 0) || 0,
        },
      ].filter((s) => s.value > 0)
      if (bands.length > 0) {
        out.readability = {
          bands,
          score: typeof ux.readabilityScore === 'number' ? ux.readabilityScore : undefined,
          grade:
            typeof ux.readabilityGrade === 'string'
              ? localizeReadabilityGrade(ux.readabilityGrade)
              : undefined,
          dwellSecondsMedian:
            typeof ux.dwellSecondsMedian === 'number'
              ? ux.dwellSecondsMedian
              : ux.dwellSecondsMedian === null
                ? null
                : undefined,
        }
      }
    }
  }

  if (eco) {
    const dist = eco.gradeDistribution
    if (dist && typeof dist === 'object') {
      const d = dist as Record<string, unknown>
      const grades = (['A+', 'A', 'B', 'C', 'D', 'E', 'F'] as const)
        .map((g) => ({ id: g, label: g, value: Number(d[g] ?? 0) || 0 }))
        .filter((g) => g.value > 0)
      if (grades.length > 0) {
        out.eco = {
          grades,
          grade: typeof eco.grade === 'string' ? eco.grade : undefined,
          avgCo2: typeof eco.avgCo2 === 'number' ? eco.avgCo2 : undefined,
        }
      }
    }
  }

  if (links) {
    const internal = Number(links.internal ?? 0) || 0
    const external = Number(links.external ?? 0) || 0
    const broken = Number(links.broken ?? 0) || 0
    const total =
      typeof links.total === 'number' && Number.isFinite(links.total)
        ? links.total
        : internal + external
    const slices: DomainScanDistributionSlice[] = [
      { id: 'internal', label: DIST_SLICE_LABEL_DE.internal, value: internal },
      { id: 'external', label: DIST_SLICE_LABEL_DE.external, value: external },
      { id: 'broken', label: DIST_SLICE_LABEL_DE.broken, value: broken },
    ].filter((s) => s.value > 0)
    if (slices.length > 0 || broken === 0) {
      // Show link mix when any positive slice exists (broken may be zero and only in center).
      if (slices.length > 0) {
        out.links = { slices, internal, external, broken, total }
      }
    }
  }

  return hasDomainScanDistributions(out) ? out : undefined
}
