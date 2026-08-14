import React from 'react'
import { Document, Text, View } from '@react-pdf/renderer'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import {
  EQC_REPORT_COPY,
  eqcSeverityLabel,
} from '@/lib/assistant/reports/event-quick-check-report-copy'
import { resolveEventQuickCheckDashboardLayout } from '@/lib/assistant/event-quick-check/resolve-event-quick-check-dashboard-layout'
import { resolveReportPersonas } from '@/lib/assistant/reports/resolve-report-personas'
import { formatReportGeneratedAt, humanizeTraitKey } from '@/lib/assistant/reports/format-report-text'
import { pdfCoverEyebrow } from '@/lib/paths/pdf-cover-copy'
import {
  MagChapter,
  MagCover,
  MagDonut,
  MagLedger,
  MagPage,
  MagPersonaGrid,
  MagPullQuote,
  MagRankedList,
  MagScoreRing,
  MagTable,
  MagTwoColumn,
  magColors,
  magStyles,
  type MagCoverKpi,
  type MagPersonaCardModel,
} from '@msqdx/ui/mag'
import { packEqcMagazinePages } from '@/lib/assistant/reports/pdf/magazine/pack-magazine-pages'
import { MsqdxLogoPdf } from '@/lib/assistant/reports/pdf/msqdx/MsqdxLogoPdf'
import {
  localizeDistSliceLabel,
  localizeReadabilityGrade,
} from '@/lib/integrations/map-domain-scan-distributions'

function toMagPersonas(
  personas: ReturnType<typeof resolveReportPersonas>,
): MagPersonaCardModel[] {
  return personas.map((p) => ({
    id: p.id,
    name: p.name,
    segment: p.segment,
    confidence: p.confidence,
    bio: p.bio,
    headline: p.headline,
    traits: p.traits.map((t) => ({
      displayName: t.displayName || humanizeTraitKey(t.name),
      score: t.score,
    })),
    goals: p.goals,
    painPoints: p.painPoints,
  }))
}

const MAG_PERSONA_LABELS = {
  confidence: EQC_REPORT_COPY.personaConfidence,
  goals: EQC_REPORT_COPY.sectionGoals,
  painPoints: EQC_REPORT_COPY.sectionPainPoints,
} as const

function formatKpiValue(value: string | number, unit?: string): string {
  return `${value}${unit ? ` ${unit}` : ''}`
}

function parseNumericKpi(value: string | number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const m = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

function coverKpis(report: EventQuickCheckReportModel): MagCoverKpi[] {
  return report.executive.kpiTiles.slice(0, 4).map((k) => {
    const n = parseNumericKpi(k.value)
    const looksScore =
      /score|geo|fitness|domain/i.test(k.label) && n != null && n <= 100
    return {
      label: k.label,
      value: formatKpiValue(k.value, k.unit),
      ringValue: looksScore ? n : null,
      ringMax: 100,
    }
  })
}

function promptDossierItems(report: EventQuickCheckReportModel) {
  const byModel = report.geo.citationHighlightsByModel
  const runs =
    byModel?.flatMap((slice) =>
      (slice.runs ?? []).map((run) => ({
        query: run.query,
        model: slice.modelLabel,
        citations: run.citations,
      })),
    ) ?? []
  if (runs.length) {
    const byQuery = new Map<string, typeof runs>()
    for (const run of runs) {
      const list = byQuery.get(run.query) ?? []
      list.push(run)
      byQuery.set(run.query, list)
    }
    return [...byQuery.entries()].slice(0, 8).map(([query, group]) => {
      const ownHits = group
        .flatMap((g) => g.citations)
        .filter((c) =>
          c.domain.toLowerCase().includes(report.meta.domain.replace(/^www\./, '').toLowerCase()),
        )
        .sort((a, b) => a.position - b.position)
      const best = ownHits[0]
      return {
        label: query,
        meta: best
          ? `Beste Position ${best.position} · ${group.length} Modelle`
          : `${group.length} Modelle · nicht zitiert`,
      }
    })
  }
  return report.geo.questions.slice(0, 8).map((q) => ({ label: q }))
}

export function buildEqcMagazinePdfChapters(report: EventQuickCheckReportModel): string[] {
  const layout = resolveEventQuickCheckDashboardLayout(report)
  const keys: string[] = ['cover']
  if (layout.showMarket) keys.push('market')
  if (layout.showDomain) keys.push('domain')
  if (layout.showDistributions) keys.push('distributions')
  if (layout.showDomainComparison) keys.push('domain-comparison')
  if (layout.showPersona) keys.push('persona')
  if (layout.geoSpan > 0) keys.push('geo')
  if (layout.showGeoEeat) keys.push('eeat')
  if (layout.showGeoRecommendations) keys.push('geo-recs')
  if (layout.showInsights) keys.push('insights')
  keys.push('appendix')
  return keys
}

/** Page groups after content-weight packing (cover stays solo). */
export function buildEqcMagazinePdfPageGroups(report: EventQuickCheckReportModel): string[][] {
  return packEqcMagazinePages(buildEqcMagazinePdfChapters(report), report)
}

type ChapterCtx = {
  report: EventQuickCheckReportModel
  layout: ReturnType<typeof resolveEventQuickCheckDashboardLayout>
  personas: ReturnType<typeof resolveReportPersonas>
  generatedAt: string
  chapterKeys: string[]
}

function chapterIndex(keys: string[], key: string) {
  const i = keys.indexOf(key)
  return i > 0 ? String(i).padStart(2, '0') : undefined
}

function renderChapter(key: string, ctx: ChapterCtx, stacked: boolean): React.ReactNode {
  const { report, layout, personas, generatedAt, chapterKeys } = ctx
  const index = chapterIndex(chapterKeys, key)
  const stackedProp = stacked ? true : undefined

  switch (key) {
    case 'cover':
      return (
        <MagCover
          key="cover"
          eyebrow={pdfCoverEyebrow(EQC_REPORT_COPY.pdfCoverEyebrow)}
          title={report.meta.title || EQC_REPORT_COPY.reportPinLabel}
          url={report.meta.url}
          meta={[report.meta.projectName, generatedAt].filter(Boolean).join(' · ')}
          fazit={layout.showExecutiveFazit ? report.executive.fazit : undefined}
          kpis={coverKpis(report)}
        />
      )
    case 'market':
      if (!layout.showMarket || !report.market) return null
      return (
        <MagChapter
          key="market"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionMarket}
          title={EQC_REPORT_COPY.sectionMarket}
        >
          {report.market.executiveSummary && report.market.keyFindings.length > 0 ? (
            <MagTwoColumn
              left={
                <View>
                  <Text style={magStyles.subEyebrow}>Überblick</Text>
                  <Text style={magStyles.body}>{report.market.executiveSummary}</Text>
                  {report.market.implications ? (
                    <Text style={[magStyles.meta, { marginTop: 10 }]}>
                      {report.market.implications}
                    </Text>
                  ) : null}
                </View>
              }
              right={
                <View>
                  <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.sectionFindings}</Text>
                  <MagRankedList
                    compact
                    items={report.market.keyFindings.map((f) => ({ label: f }))}
                  />
                </View>
              }
            />
          ) : (
            <>
              {report.market.executiveSummary ? (
                <Text style={magStyles.body}>{report.market.executiveSummary}</Text>
              ) : null}
              {report.market.keyFindings.length > 0 ? (
                <MagRankedList
                  columns={2}
                  items={report.market.keyFindings.map((f) => ({ label: f }))}
                />
              ) : null}
              {report.market.implications ? (
                <Text style={magStyles.meta}>{report.market.implications}</Text>
              ) : null}
            </>
          )}
        </MagChapter>
      )
    case 'domain':
      if (!layout.showDomain || !report.domain) return null
      return (
        <MagChapter
          key="domain"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionDomainScan}
          title={EQC_REPORT_COPY.sectionDomain}
          lede={report.domain.domain}
        >
          {report.domain.topIssues.length > 0 ? (
            <MagTwoColumn
              left={
                <View>
                  <View style={[magStyles.row, { marginBottom: 16 }]}>
                    <View style={{ marginRight: 16 }}>
                      <MagScoreRing
                        value={report.domain.score}
                        label={EQC_REPORT_COPY.colScore}
                        size={72}
                      />
                    </View>
                    <View style={[magStyles.col, { paddingTop: 6 }]}>
                      <Text style={magStyles.kpiValue}>{report.domain.totalPages}</Text>
                      <Text style={magStyles.kpiLabel}>{EQC_REPORT_COPY.colPages}</Text>
                      <Text style={[magStyles.meta, { marginTop: 10 }]}>
                        Fehler {report.domain.stats.errors} · Warnungen{' '}
                        {report.domain.stats.warnings}
                      </Text>
                    </View>
                  </View>
                </View>
              }
              right={
                <View>
                  <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.sectionTopIssues}</Text>
                  <MagRankedList
                    compact
                    items={report.domain.topIssues.slice(0, 8).map((issue) => ({
                      label: issue.title,
                      meta: `${issue.count}×`,
                    }))}
                  />
                </View>
              }
            />
          ) : (
            <View style={[magStyles.row, { marginBottom: 22 }]}>
              <View style={{ marginRight: 20 }}>
                <MagScoreRing value={report.domain.score} label={EQC_REPORT_COPY.colScore} size={80} />
              </View>
              <View style={[magStyles.col, { paddingTop: 8 }]}>
                <Text style={magStyles.kpiValue}>{report.domain.totalPages}</Text>
                <Text style={magStyles.kpiLabel}>{EQC_REPORT_COPY.colPages}</Text>
                <Text style={[magStyles.meta, { marginTop: 12 }]}>
                  Fehler {report.domain.stats.errors} · Warnungen {report.domain.stats.warnings}
                </Text>
              </View>
            </View>
          )}
        </MagChapter>
      )
    case 'distributions':
      if (!layout.showDistributions || !report.distributions) return null
      return (
        <MagChapter
          key="distributions"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionDistributions}
          title={EQC_REPORT_COPY.sectionDistributionsHeadline}
          lede={EQC_REPORT_COPY.sectionDistributionsHint}
        >
          <View style={magStyles.distGrid}>
            {report.distributions.readability?.bands.length ? (
              <View style={magStyles.distCol}>
                <Text style={magStyles.eyebrow}>{EQC_REPORT_COPY.distReadability}</Text>
                {report.distributions.readability.grade ? (
                  <Text style={magStyles.meta}>
                    {EQC_REPORT_COPY.distCorpusGrade(
                      localizeReadabilityGrade(report.distributions.readability.grade),
                    )}
                  </Text>
                ) : null}
                <MagDonut
                  slices={report.distributions.readability.bands.map((s) => ({
                    ...s,
                    label: localizeDistSliceLabel(s.id, s.label),
                  }))}
                  centerValue={report.distributions.readability.score}
                  centerLabel={EQC_REPORT_COPY.distScoreLabel}
                  size={76}
                />
              </View>
            ) : null}
            {report.distributions.eco?.grades.length ? (
              <View style={magStyles.distCol}>
                <Text style={magStyles.eyebrow}>{EQC_REPORT_COPY.distEcoGrades}</Text>
                {report.distributions.eco.grade ? (
                  <Text style={magStyles.meta}>
                    {EQC_REPORT_COPY.distDominantGrade(report.distributions.eco.grade)}
                  </Text>
                ) : null}
                <MagDonut
                  slices={report.distributions.eco.grades}
                  centerValue={report.distributions.eco.grade}
                  centerLabel={EQC_REPORT_COPY.distModeLabel}
                  size={76}
                />
              </View>
            ) : null}
            {report.distributions.links?.slices.length ? (
              <View style={magStyles.distCol}>
                <Text style={magStyles.eyebrow}>{EQC_REPORT_COPY.distLinkMix}</Text>
                <Text style={magStyles.meta}>
                  {EQC_REPORT_COPY.distLinksTotal(
                    report.distributions.links.total.toLocaleString('de-DE'),
                  )}
                </Text>
                <MagDonut
                  slices={report.distributions.links.slices.map((s) => ({
                    ...s,
                    label: localizeDistSliceLabel(s.id, s.label),
                  }))}
                  centerValue={report.distributions.links.broken.toLocaleString('de-DE')}
                  centerLabel={EQC_REPORT_COPY.distBrokenLabel}
                  size={76}
                />
              </View>
            ) : null}
          </View>
        </MagChapter>
      )
    case 'domain-comparison':
      if (!layout.showDomainComparison || !report.domainComparison?.rows.length) return null
      return (
        <MagChapter
          key="domain-comparison"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionDomainComparison}
          title={EQC_REPORT_COPY.sectionDomainComparison}
        >
          <MagTable
            columns={[
              EQC_REPORT_COPY.colDomain,
              EQC_REPORT_COPY.colRole,
              EQC_REPORT_COPY.colScore,
              EQC_REPORT_COPY.colPages,
              'Fehler',
            ]}
            rows={report.domainComparison.rows.map((r) => [
              r.domain,
              r.role === 'own' ? EQC_REPORT_COPY.domainRoleOwn : EQC_REPORT_COPY.domainRoleCompetitor,
              r.score,
              r.totalPages,
              r.stats.errors,
            ])}
          />
        </MagChapter>
      )
    case 'persona':
      if (!layout.showPersona || !personas.length) return null
      return (
        <MagChapter
          key="persona"
          stacked={stackedProp}
          index={index}
          eyebrow={
            personas.length > 1 ? EQC_REPORT_COPY.sectionPersonas : EQC_REPORT_COPY.sectionPersona
          }
          title={
            personas.length > 1 ? EQC_REPORT_COPY.sectionPersonas : EQC_REPORT_COPY.sectionPersona
          }
        >
          <MagPersonaGrid personas={toMagPersonas(personas)} labels={MAG_PERSONA_LABELS} />
        </MagChapter>
      )
    case 'geo':
      if (layout.geoSpan <= 0) return null
      return (
        <MagChapter
          key="geo"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionGeo}
          title={EQC_REPORT_COPY.sectionGeoCheck}
          lede={
            report.geo.status === 'failed'
              ? report.geo.errorMessage || EQC_REPORT_COPY.geoIncomplete
              : undefined
          }
        >
          <View style={[magStyles.row, { marginBottom: 20 }]}>
            {report.geo.overallScore != null ? (
              <View style={{ marginRight: 20 }}>
                <MagScoreRing value={report.geo.overallScore} label="GEO Score" size={68} />
              </View>
            ) : null}
            {report.geo.geoFitnessScore != null ? (
              <View style={{ marginRight: 12 }}>
                <MagScoreRing
                  value={report.geo.geoFitnessScore}
                  label={EQC_REPORT_COPY.kpiGeoFitness}
                  size={68}
                />
              </View>
            ) : null}
          </View>
          {report.geo.competitors.length > 0 && promptDossierItems(report).length > 0 ? (
            <MagTwoColumn
              left={
                <View>
                  <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.competitors}</Text>
                  <MagRankedList
                    compact
                    items={report.geo.competitors.slice(0, 8).map((c) => ({
                      label: c.name,
                      meta: [
                        c.shareOfVoice != null
                          ? `${EQC_REPORT_COPY.colShareOfVoice} ${Math.round(c.shareOfVoice * (c.shareOfVoice <= 1 ? 100 : 1))}%`
                          : null,
                        c.avgPosition != null ? `Ø Pos. ${c.avgPosition}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    }))}
                  />
                </View>
              }
              right={
                <View>
                  <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.geoPromptsLabel}</Text>
                  <MagRankedList compact items={promptDossierItems(report)} />
                </View>
              }
            />
          ) : (
            <>
              {report.geo.competitors.length > 0 ? (
                <>
                  <Text style={magStyles.eyebrow}>{EQC_REPORT_COPY.competitors}</Text>
                  <MagRankedList
                    columns={2}
                    items={report.geo.competitors.slice(0, 8).map((c) => ({
                      label: c.name,
                      meta: [
                        c.shareOfVoice != null
                          ? `${EQC_REPORT_COPY.colShareOfVoice} ${Math.round(c.shareOfVoice * (c.shareOfVoice <= 1 ? 100 : 1))}%`
                          : null,
                        c.avgPosition != null ? `Ø Pos. ${c.avgPosition}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    }))}
                  />
                </>
              ) : null}
              {promptDossierItems(report).length > 0 ? (
                <>
                  <Text style={[magStyles.eyebrow, { marginTop: 14 }]}>
                    {EQC_REPORT_COPY.geoPromptsLabel}
                  </Text>
                  <MagRankedList columns={2} items={promptDossierItems(report)} />
                </>
              ) : null}
            </>
          )}
        </MagChapter>
      )
    case 'eeat':
      if (!layout.showGeoEeat || !report.geo.eeatDimensions.length) return null
      return (
        <MagChapter
          key="eeat"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionGeoEeat}
          title={EQC_REPORT_COPY.sectionGeoEeat}
        >
          {report.geo.geoFitnessReasoning || EQC_REPORT_COPY.geoEeatWhyFallback ? (
            <MagPullQuote
              body={report.geo.geoFitnessReasoning || EQC_REPORT_COPY.geoEeatWhyFallback}
            />
          ) : null}
          <MagLedger
            items={report.geo.eeatDimensions.map((d) => ({
              label: d.label,
              score: d.score,
              detail: d.reasoning,
            }))}
          />
          {report.geo.eeatMissingElements?.length ? (
            <View style={magStyles.sectionBlock}>
              <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.geoEeatGapsLabel}</Text>
              <MagRankedList
                columns={2}
                items={report.geo.eeatMissingElements.map((g) => ({ label: g }))}
              />
            </View>
          ) : null}
        </MagChapter>
      )
    case 'geo-recs':
      if (!layout.showGeoRecommendations || !report.geo.recommendations.length) return null
      return (
        <MagChapter
          key="geo-recs"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionGeoRecommendations}
          title={EQC_REPORT_COPY.sectionGeoRecommendations}
        >
          <MagRankedList
            columns={2}
            items={report.geo.recommendations.slice(0, 10).map((r) => ({
              label: r.title,
              meta: r.description,
            }))}
          />
        </MagChapter>
      )
    case 'insights':
      if (!layout.showInsights || !report.insights) return null
      return (
        <MagChapter
          key="insights"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionInsights}
          title={EQC_REPORT_COPY.fazit}
        >
          {report.insights.fazit || report.insights.assessment ? (
            <MagPullQuote body={report.insights.fazit || report.insights.assessment || ''} />
          ) : null}
          {report.insights.findings.length > 0 ? (
            <>
              <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.sectionFindings}</Text>
              <MagRankedList
                columns={2}
                items={report.insights.findings.slice(0, 10).map((f) => ({
                  label: f.severity
                    ? `[${eqcSeverityLabel(f.severity)}] ${f.title}`
                    : f.title,
                  meta: f.description,
                }))}
              />
            </>
          ) : null}
        </MagChapter>
      )
    case 'appendix':
      return (
        <MagChapter
          key="appendix"
          stacked={stackedProp}
          index={index}
          eyebrow={EQC_REPORT_COPY.sectionAppendix}
          title={EQC_REPORT_COPY.sectionAppendix}
        >
          {report.appendix.stepTable.rows.length > 0 ? (
            <>
              <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.appendixSteps}</Text>
              <MagTable
                columns={report.appendix.stepTable.columns}
                rows={report.appendix.stepTable.rows}
              />
            </>
          ) : null}
          {report.appendix.links.length > 0 ? (
            <>
              <Text style={[magStyles.subEyebrow, { marginTop: 16 }]}>{EQC_REPORT_COPY.links}</Text>
              {report.appendix.links.map((link, i) => (
                <Text key={i} style={magStyles.meta}>
                  {link.label}: {link.href}
                </Text>
              ))}
            </>
          ) : null}
          {(report.appendix.scanId || report.appendix.geoJobId) && (
            <Text style={[magStyles.meta, { marginTop: 12 }]}>
              {[
                report.appendix.scanId ? `Scan-ID: ${report.appendix.scanId}` : null,
                report.appendix.geoJobId ? `GEO-Job: ${report.appendix.geoJobId}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </MagChapter>
      )
    default:
      return null
  }
}

export function EqcMagazinePdfDocument({ report }: { report: EventQuickCheckReportModel }) {
  const layout = resolveEventQuickCheckDashboardLayout(report)
  const personas = resolveReportPersonas(report)
  const generatedAt = formatReportGeneratedAt(report.meta.generatedAt)
  const footerTitle = report.meta.domain || report.meta.title
  const chapterKeys = buildEqcMagazinePdfChapters(report)
  const pageGroups = packEqcMagazinePages(chapterKeys, report)
  const ctx: ChapterCtx = { report, layout, personas, generatedAt, chapterKeys }

  return (
    <Document>
      {pageGroups.map((group, pageIdx) => {
        const isCoverOnly = group.length === 1 && group[0] === 'cover'
        return (
          <MagPage
            key={`page-${pageIdx}-${group.join('+')}`}
            footerTitle={footerTitle}
            showLogo={isCoverOnly}
            logo={<MsqdxLogoPdf width={52} height={12} color={magColors.ink} />}
          >
            {group.map((key, i) => renderChapter(key, ctx, i > 0))}
          </MagPage>
        )
      })}
    </Document>
  )
}

/** @deprecated alias — prefer EqcMagazinePdfDocument */
export function EventQuickCheckReportPdfDocument({
  report,
}: {
  report: EventQuickCheckReportModel
}) {
  return <EqcMagazinePdfDocument report={report} />
}

export function renderEventQuickCheckReportPdf(
  report: EventQuickCheckReportModel,
): React.ReactElement {
  return <EqcMagazinePdfDocument report={report} />
}

/** Structural chapter list for tests (replaces old page-builder keys). */
export function buildEventQuickCheckReportPages(
  report: EventQuickCheckReportModel,
): Array<{ key: string }> {
  return buildEqcMagazinePdfChapters(report).map((key) => ({ key }))
}
