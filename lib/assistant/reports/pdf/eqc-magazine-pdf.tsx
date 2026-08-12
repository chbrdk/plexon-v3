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
  MagChip,
  MagChipRow,
  MagCover,
  MagDonut,
  MagLedger,
  MagPage,
  MagRankedList,
  MagScoreRing,
  MagTable,
  MagTraitBars,
  magStyles,
  type MagCoverKpi,
} from '@/lib/assistant/reports/pdf/magazine'
import {
  localizeDistSliceLabel,
  localizeReadabilityGrade,
} from '@/lib/integrations/map-domain-scan-distributions'

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

export function EqcMagazinePdfDocument({ report }: { report: EventQuickCheckReportModel }) {
  const layout = resolveEventQuickCheckDashboardLayout(report)
  const personas = resolveReportPersonas(report)
  const generatedAt = formatReportGeneratedAt(report.meta.generatedAt)
  const footerTitle = report.meta.domain || report.meta.title
  const chapterKeys = buildEqcMagazinePdfChapters(report)

  const cover = (
    <MagPage key="cover" footerTitle={footerTitle} showLogo>
      <MagCover
        eyebrow={pdfCoverEyebrow(EQC_REPORT_COPY.pdfCoverEyebrow)}
        title={report.meta.title || EQC_REPORT_COPY.reportPinLabel}
        url={report.meta.url}
        meta={[report.meta.projectName, generatedAt].filter(Boolean).join(' · ')}
        fazit={layout.showExecutiveFazit ? report.executive.fazit : undefined}
        kpis={coverKpis(report)}
      />
    </MagPage>
  )

  const market =
    layout.showMarket && report.market ? (
      <MagPage key="market" footerTitle={footerTitle}>
        <MagChapter eyebrow={EQC_REPORT_COPY.sectionMarket} title={EQC_REPORT_COPY.sectionMarket}>
          {report.market.executiveSummary ? (
            <Text style={magStyles.body}>{report.market.executiveSummary}</Text>
          ) : null}
          {report.market.keyFindings.length > 0 ? (
            <MagRankedList items={report.market.keyFindings.map((f) => ({ label: f }))} />
          ) : null}
          {report.market.implications ? (
            <Text style={magStyles.meta}>{report.market.implications}</Text>
          ) : null}
        </MagChapter>
      </MagPage>
    ) : null

  const domain =
    layout.showDomain && report.domain ? (
      <MagPage key="domain" footerTitle={footerTitle}>
        <MagChapter
          eyebrow={EQC_REPORT_COPY.sectionDomainScan}
          title={EQC_REPORT_COPY.sectionDomain}
          lede={report.domain.domain}
        >
          <View style={[magStyles.row, { marginBottom: 12 }]}>
            <MagScoreRing value={report.domain.score} label={EQC_REPORT_COPY.colScore} size={88} />
            <View style={magStyles.col}>
              <Text style={magStyles.kpiValue}>{report.domain.totalPages}</Text>
              <Text style={magStyles.kpiLabel}>{EQC_REPORT_COPY.colPages}</Text>
              <Text style={[magStyles.meta, { marginTop: 8 }]}>
                Fehler {report.domain.stats.errors} · Warnungen {report.domain.stats.warnings}
              </Text>
            </View>
          </View>
          {report.domain.topIssues.length > 0 ? (
            <>
              <Text style={magStyles.eyebrow}>{EQC_REPORT_COPY.sectionTopIssues}</Text>
              <MagRankedList
                items={report.domain.topIssues.slice(0, 8).map((issue) => ({
                  label: issue.title,
                  meta: `${issue.count}×`,
                }))}
              />
            </>
          ) : null}
        </MagChapter>
      </MagPage>
    ) : null

  const distributions =
    layout.showDistributions && report.distributions ? (
      <MagPage key="distributions" footerTitle={footerTitle}>
        <MagChapter
          eyebrow={EQC_REPORT_COPY.sectionDistributions}
          title={EQC_REPORT_COPY.sectionDistributionsHeadline}
          lede={EQC_REPORT_COPY.sectionDistributionsHint}
        >
          <View style={magStyles.row}>
            {report.distributions.readability?.bands.length ? (
              <View style={[magStyles.col, { width: '32%' }]}>
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
                  size={84}
                />
              </View>
            ) : null}
            {report.distributions.eco?.grades.length ? (
              <View style={[magStyles.col, { width: '32%' }]}>
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
                  size={84}
                />
              </View>
            ) : null}
            {report.distributions.links?.slices.length ? (
              <View style={[magStyles.col, { width: '32%' }]}>
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
                  size={84}
                />
              </View>
            ) : null}
          </View>
        </MagChapter>
      </MagPage>
    ) : null

  const domainComparison =
    layout.showDomainComparison && report.domainComparison?.rows.length ? (
      <MagPage key="domain-comparison" footerTitle={footerTitle}>
        <MagChapter
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
      </MagPage>
    ) : null

  const persona =
    layout.showPersona && personas.length ? (
      <MagPage key="persona" footerTitle={footerTitle}>
        <MagChapter
          eyebrow={
            personas.length > 1 ? EQC_REPORT_COPY.sectionPersonas : EQC_REPORT_COPY.sectionPersona
          }
          title={
            personas.length > 1 ? EQC_REPORT_COPY.sectionPersonas : EQC_REPORT_COPY.sectionPersona
          }
        >
          {personas.map((p, idx) => (
            <View key={p.id || `p-${idx}`} style={{ marginBottom: 14 }} wrap={false}>
              {idx > 0 ? <View style={magStyles.rule} /> : null}
              <Text style={magStyles.headline}>{p.name}</Text>
              <MagChipRow>
                {p.segment ? <MagChip>{p.segment}</MagChip> : null}
                <MagChip>
                  {Math.round(p.confidence <= 1 ? p.confidence * 100 : p.confidence)}%{' '}
                  {EQC_REPORT_COPY.personaConfidence}
                </MagChip>
              </MagChipRow>
              {p.bio || p.headline ? (
                <Text style={magStyles.body}>{p.bio || p.headline}</Text>
              ) : null}
              {p.traits.length > 0 ? (
                <MagTraitBars
                  traits={p.traits.map((t) => ({
                    displayName: t.displayName || humanizeTraitKey(t.name),
                    score: t.score,
                  }))}
                />
              ) : null}
              {p.goals.length > 0 ? (
                <>
                  <Text style={[magStyles.eyebrow, { marginTop: 8 }]}>
                    {EQC_REPORT_COPY.sectionGoals}
                  </Text>
                  <MagRankedList items={p.goals.slice(0, 5).map((g) => ({ label: g }))} />
                </>
              ) : null}
              {p.painPoints.length > 0 ? (
                <>
                  <Text style={[magStyles.eyebrow, { marginTop: 6 }]}>
                    {EQC_REPORT_COPY.sectionPainPoints}
                  </Text>
                  <MagRankedList items={p.painPoints.slice(0, 5).map((g) => ({ label: g }))} />
                </>
              ) : null}
            </View>
          ))}
        </MagChapter>
      </MagPage>
    ) : null

  const geo =
    layout.geoSpan > 0 ? (
      <MagPage key="geo" footerTitle={footerTitle}>
        <MagChapter
          eyebrow={EQC_REPORT_COPY.sectionGeo}
          title={EQC_REPORT_COPY.sectionGeoCheck}
          lede={
            report.geo.status === 'failed'
              ? report.geo.errorMessage || EQC_REPORT_COPY.geoIncomplete
              : undefined
          }
        >
          <View style={[magStyles.row, { marginBottom: 12 }]}>
            {report.geo.overallScore != null ? (
              <MagScoreRing
                value={report.geo.overallScore}
                label="GEO Score"
                size={88}
              />
            ) : null}
            {report.geo.geoFitnessScore != null ? (
              <MagScoreRing
                value={report.geo.geoFitnessScore}
                label={EQC_REPORT_COPY.kpiGeoFitness}
                size={88}
              />
            ) : null}
          </View>
          {report.geo.competitors.length > 0 ? (
            <>
              <Text style={magStyles.eyebrow}>{EQC_REPORT_COPY.competitors}</Text>
              <MagRankedList
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
              <Text style={[magStyles.eyebrow, { marginTop: 10 }]}>
                {EQC_REPORT_COPY.geoPromptsLabel}
              </Text>
              <MagRankedList items={promptDossierItems(report)} />
            </>
          ) : null}
        </MagChapter>
      </MagPage>
    ) : null

  const eeat =
    layout.showGeoEeat && report.geo.eeatDimensions.length ? (
      <MagPage key="eeat" footerTitle={footerTitle}>
        <MagChapter
          eyebrow={EQC_REPORT_COPY.sectionGeoEeat}
          title={EQC_REPORT_COPY.sectionGeoEeat}
          lede={report.geo.geoFitnessReasoning || EQC_REPORT_COPY.geoEeatWhyFallback}
        >
          <MagLedger
            items={report.geo.eeatDimensions.map((d) => ({
              label: d.label,
              score: d.score,
              detail: d.reasoning,
            }))}
          />
          {report.geo.eeatMissingElements?.length ? (
            <>
              <Text style={[magStyles.eyebrow, { marginTop: 10 }]}>
                {EQC_REPORT_COPY.geoEeatGapsLabel}
              </Text>
              <MagRankedList
                items={report.geo.eeatMissingElements.map((g) => ({ label: g }))}
              />
            </>
          ) : null}
        </MagChapter>
      </MagPage>
    ) : null

  const geoRecs =
    layout.showGeoRecommendations && report.geo.recommendations.length ? (
      <MagPage key="geo-recs" footerTitle={footerTitle}>
        <MagChapter
          eyebrow={EQC_REPORT_COPY.sectionGeoRecommendations}
          title={EQC_REPORT_COPY.sectionGeoRecommendations}
        >
          <MagRankedList
            items={report.geo.recommendations.slice(0, 10).map((r) => ({
              label: r.title,
              meta: r.description,
            }))}
          />
        </MagChapter>
      </MagPage>
    ) : null

  const insights =
    layout.showInsights && report.insights ? (
      <MagPage key="insights" footerTitle={footerTitle}>
        <MagChapter
          eyebrow={EQC_REPORT_COPY.sectionInsights}
          title={EQC_REPORT_COPY.fazit}
          lede={report.insights.fazit || report.insights.assessment}
        >
          {report.insights.findings.length > 0 ? (
            <>
              <Text style={magStyles.eyebrow}>{EQC_REPORT_COPY.sectionFindings}</Text>
              <MagRankedList
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
      </MagPage>
    ) : null

  const appendix = (
    <MagPage key="appendix" footerTitle={footerTitle}>
      <MagChapter eyebrow={EQC_REPORT_COPY.sectionAppendix} title={EQC_REPORT_COPY.sectionAppendix}>
        {report.appendix.stepTable.rows.length > 0 ? (
          <>
            <Text style={magStyles.eyebrow}>{EQC_REPORT_COPY.appendixSteps}</Text>
            <MagTable
              columns={report.appendix.stepTable.columns}
              rows={report.appendix.stepTable.rows}
            />
          </>
        ) : null}
        {report.appendix.links.length > 0 ? (
          <>
            <Text style={[magStyles.eyebrow, { marginTop: 10 }]}>{EQC_REPORT_COPY.links}</Text>
            {report.appendix.links.map((link, i) => (
              <Text key={i} style={magStyles.meta}>
                {link.label}: {link.href}
              </Text>
            ))}
          </>
        ) : null}
        {(report.appendix.scanId || report.appendix.geoJobId) && (
          <Text style={[magStyles.meta, { marginTop: 8 }]}>
            {[
              report.appendix.scanId ? `Scan-ID: ${report.appendix.scanId}` : null,
              report.appendix.geoJobId ? `GEO-Job: ${report.appendix.geoJobId}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </MagChapter>
    </MagPage>
  )

  const pagesByKey: Record<string, React.ReactNode> = {
    cover,
    market,
    domain,
    distributions,
    'domain-comparison': domainComparison,
    persona,
    geo,
    eeat,
    'geo-recs': geoRecs,
    insights,
    appendix,
  }

  return (
    <Document>
      {chapterKeys.map((key) => pagesByKey[key]).filter(Boolean)}
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
export function buildEventQuickCheckReportPages(report: EventQuickCheckReportModel): Array<{ key: string }> {
  return buildEqcMagazinePdfChapters(report).map((key) => ({ key }))
}
