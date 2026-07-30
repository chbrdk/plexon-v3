import React from 'react';
import { Document, Text, View } from '@react-pdf/renderer';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EQC_REPORT_COPY, eqcSeverityLabel } from '@/lib/assistant/reports/event-quick-check-report-copy';
import { pdfCoverEyebrow } from '@/lib/paths/pdf-cover-copy';
import {
  PdfCoverPage,
  PdfContentPage,
  PdfLeadText,
  PdfStatGrid,
  PdfDataTable,
  applyReportFooters,
  contentSideForIndex,
  PDF_DOCUMENT_PAGE_LAYOUT,
} from '@/lib/assistant/reports/pdf/msqdx/PdfPrintPages';
import {
  PdfSectionHeader,
  PdfSectionIntro,
  PdfRecommendationRow,
} from '@/lib/assistant/reports/pdf/msqdx/PdfPrimitives';
import { PdfQuickCheckCoverContent } from '@/lib/assistant/reports/pdf/msqdx/PdfCoverContent';
import { pdfColors, pdfStyles } from '@/lib/assistant/reports/pdf/msqdx/pdf-styles';

function pushContent(pages: React.ReactElement[], key: string, children: React.ReactNode): React.ReactElement[] {
  const side = contentSideForIndex(pages.length);
  return [...pages, <PdfContentPage key={key} side={side}>{children}</PdfContentPage>];
}

function toPdfDataTable(columns: string[], rows: Array<Array<string | number | null>>) {
  const width = `${100 / Math.max(columns.length, 1)}%`;
  return (
    <PdfDataTable
      columns={columns.map((label, i) => ({ key: `col-${i}`, label, width }))}
      rows={rows.map((row) =>
        Object.fromEntries(columns.map((_, ci) => [`col-${ci}`, String(row[ci] ?? '–')]))
      )}
    />
  );
}

function formatKpiValue(value: string | number, unit?: string): string {
  return `${value}${unit ? ` ${unit}` : ''}`;
}

function coverScoreItems(report: EventQuickCheckReportModel): Array<{ label: string; value: string }> {
  return report.executive.kpiTiles.slice(0, 4).map((k) => ({
    label: k.label,
    value: formatKpiValue(k.value, k.unit),
  }));
}

function flattenCitationRows(
  report: EventQuickCheckReportModel
): Array<Array<string | number | null>> {
  const byModel = report.geo.citationHighlightsByModel;
  if (byModel?.length) {
    return byModel.flatMap((slice) =>
      slice.citations.slice(0, 8).map((c) => [
        slice.modelLabel,
        c.query.length > 60 ? `${c.query.slice(0, 57)}…` : c.query,
        c.domain,
        String(c.position),
      ])
    );
  }
  return report.geo.citationHighlights.slice(0, 12).map((c) => [
    '—',
    c.query.length > 60 ? `${c.query.slice(0, 57)}…` : c.query,
    c.domain,
    String(c.position),
  ]);
}

function TraitBarsPdf({ traits }: { traits: NonNullable<EventQuickCheckReportModel['persona']>['traits'] }) {
  if (!traits.length) return null;
  return (
    <View>
      {traits.map((t) => {
        const pct = Math.round(t.score <= 1 ? t.score * 100 : t.score);
        return (
          <View key={t.name} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={pdfStyles.metaText}>{t.displayName}</Text>
              <Text style={pdfStyles.metaText}>{pct}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: pdfColors.gray200, borderRadius: 2 }}>
              <View
                style={{
                  height: 6,
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: pdfColors.accentPink,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function EeatBarsPdf({ dimensions }: { dimensions: EventQuickCheckReportModel['geo']['eeatDimensions'] }) {
  if (!dimensions.length) return null;
  return (
    <View>
      {dimensions.map((d) => {
        const pct = Math.round(d.score <= 1 ? d.score * 100 : d.score);
        return (
          <View key={d.key} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={pdfStyles.metaText}>{d.label}</Text>
              <Text style={pdfStyles.metaText}>{pct}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: pdfColors.gray200, borderRadius: 2 }}>
              <View
                style={{
                  height: 6,
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: pdfColors.brand,
                  borderRadius: 2,
                }}
              />
            </View>
            {d.reasoning ? <Text style={pdfStyles.metaText}>{d.reasoning}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function TintedListItem({ text, tint }: { text: string; tint: 'goal' | 'pain' }) {
  return (
    <View
      style={[
        pdfStyles.listItemTint,
        { backgroundColor: tint === 'goal' ? pdfColors.goalTint : pdfColors.painTint },
      ]}
    >
      <Text style={pdfStyles.bodyText}>{text}</Text>
    </View>
  );
}

function GeoStatusBanner({ report }: { report: EventQuickCheckReportModel }) {
  const { geo } = report;
  if (geo.status === 'complete') {
    return (
      <View style={[pdfStyles.statusBanner, { backgroundColor: pdfColors.goalTint }]}>
        <Text style={pdfStyles.subsectionTitle}>{EQC_REPORT_COPY.geoComplete}</Text>
      </View>
    );
  }
  if (geo.status === 'failed' || geo.status === 'partial') {
    return (
      <View style={[pdfStyles.statusBanner, { backgroundColor: 'rgba(220, 38, 38, 0.08)' }]}>
        <Text style={pdfStyles.subsectionTitle}>{EQC_REPORT_COPY.geoIncompleteTitle}</Text>
        <Text style={pdfStyles.bodyText}>{geo.errorMessage ?? EQC_REPORT_COPY.unknownError}</Text>
      </View>
    );
  }
  if (geo.status === 'skipped') {
    return (
      <View style={[pdfStyles.statusBanner, { backgroundColor: pdfColors.gray100 }]}>
        <Text style={pdfStyles.bodyText}>{EQC_REPORT_COPY.geoIncomplete}</Text>
      </View>
    );
  }
  return null;
}

export function buildEventQuickCheckReportPages(report: EventQuickCheckReportModel): React.ReactElement[] {
  let pages: React.ReactElement[] = [];
  const generatedLabel = new Date(report.meta.generatedAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  pages.push(
    <PdfCoverPage key="cover">
      <PdfQuickCheckCoverContent
        eyebrow={pdfCoverEyebrow(EQC_REPORT_COPY.pdfCoverEyebrow)}
        title={report.meta.title}
        projectLine={`${report.meta.url} · ${report.meta.domain}`}
        metaLines={[generatedLabel, report.meta.playbookLabel]}
        leadText={report.executive.summary ?? null}
        scoreItems={coverScoreItems(report)}
      />
    </PdfCoverPage>
  );

  pages = pushContent(
    pages,
    'executive',
    <View>
      <PdfLeadText>{EQC_REPORT_COPY.pdfExecutiveLead}</PdfLeadText>
      {report.executive.fazit ? (
        <View style={pdfStyles.fazitCard}>
          <Text style={pdfStyles.subsectionTitle}>{EQC_REPORT_COPY.fazit}</Text>
          <Text style={pdfStyles.bodyText}>{report.executive.fazit}</Text>
        </View>
      ) : null}
      <PdfSectionHeader title={EQC_REPORT_COPY.sectionKpi} />
      <PdfStatGrid
        items={report.executive.kpiTiles.map((k) => ({
          label: k.label,
          value: formatKpiValue(k.value, k.unit),
        }))}
      />
    </View>
  );

  pages = pushContent(
    pages,
    'domain',
    <View>
      <PdfSectionHeader title={EQC_REPORT_COPY.sectionDomain} />
      <PdfSectionIntro text={EQC_REPORT_COPY.pdfDomainSection} />
      {report.domain ? (
        <>
          <PdfStatGrid
            items={[
              { label: EQC_REPORT_COPY.colScore, value: `${report.domain.score}/100` },
              { label: EQC_REPORT_COPY.colPages, value: String(report.domain.totalPages) },
              { label: 'Fehler', value: String(report.domain.stats.errors) },
              { label: 'Warnungen', value: String(report.domain.stats.warnings) },
            ]}
          />
          {report.domain.topIssues.length > 0 ? (
            <>
              <PdfSectionHeader title={EQC_REPORT_COPY.sectionTopIssues} />
              {toPdfDataTable(
                [EQC_REPORT_COPY.colIssue, EQC_REPORT_COPY.colCount],
                report.domain.topIssues.map((i) => [i.title, i.count])
              )}
            </>
          ) : null}
        </>
      ) : (
        <PdfSectionIntro text={EQC_REPORT_COPY.noDomainScan} />
      )}
      {report.domainComparison?.rows.length ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.sectionDomainComparison} />
          {toPdfDataTable(
            [
              EQC_REPORT_COPY.colDomain,
              EQC_REPORT_COPY.colRole,
              EQC_REPORT_COPY.colScore,
              EQC_REPORT_COPY.colPages,
              'Fehler',
              'Warnungen',
            ],
            report.domainComparison.rows.map((row) => [
              row.domain,
              row.role === 'own' ? EQC_REPORT_COPY.domainRoleOwn : EQC_REPORT_COPY.domainRoleCompetitor,
              `${row.score}/100`,
              row.totalPages,
              row.stats.errors,
              row.stats.warnings,
            ])
          )}
        </>
      ) : null}
    </View>
  );

  pages = pushContent(
    pages,
    'persona',
    <View>
      <PdfSectionHeader
        title={
          (report.personas?.length ?? 0) > 1
            ? EQC_REPORT_COPY.sectionPersonas
            : EQC_REPORT_COPY.sectionPersona
        }
      />
      {report.persona || report.personas?.length ? (
        (report.personas?.length ? report.personas : report.persona ? [report.persona] : []).map(
          (persona, personaIndex) => (
            <View key={persona.id || `persona-${personaIndex}`} style={{ marginBottom: 12 }}>
              <View style={pdfStyles.cardBox}>
                <Text style={pdfStyles.subsectionTitle}>{persona.name}</Text>
                <Text style={pdfStyles.metaText}>
                  {persona.segment} · {Math.round(persona.confidence * 100)} % Confidence
                </Text>
                <Text style={pdfStyles.bodyText}>{persona.headline}</Text>
                {persona.bio ? <Text style={pdfStyles.bodyText}>{persona.bio}</Text> : null}
              </View>
              {persona.traits.length > 0 ? (
                <>
                  <PdfSectionHeader title={EQC_REPORT_COPY.sectionPersonaTraits} />
                  <TraitBarsPdf traits={persona.traits} />
                </>
              ) : null}
              {persona.goals.length > 0 ? (
                <>
                  <PdfSectionHeader title={EQC_REPORT_COPY.sectionGoals} />
                  {persona.goals.map((g, i) => (
                    <TintedListItem key={`g-${personaIndex}-${i}`} text={g} tint="goal" />
                  ))}
                </>
              ) : null}
              {persona.painPoints.length > 0 ? (
                <>
                  <PdfSectionHeader title={EQC_REPORT_COPY.sectionPainPoints} />
                  {persona.painPoints.map((p, i) => (
                    <TintedListItem key={`p-${personaIndex}-${i}`} text={p} tint="pain" />
                  ))}
                </>
              ) : null}
            </View>
          )
        )
      ) : (
        <PdfSectionIntro text={EQC_REPORT_COPY.noPersona} />
      )}
    </View>
  );

  if (report.market) {
    pages = pushContent(
      pages,
      'market',
      <View>
        <PdfSectionHeader title={EQC_REPORT_COPY.sectionMarket} />
        <PdfSectionIntro text={EQC_REPORT_COPY.pdfMarketSection} />
        {report.market.status !== 'complete' ? (
          <View style={[pdfStyles.statusBanner, { backgroundColor: pdfColors.gray100 }]}>
            <Text style={pdfStyles.bodyText}>
              {report.market.errorMessage ?? EQC_REPORT_COPY.marketIncomplete}
            </Text>
          </View>
        ) : null}
        {report.market.executiveSummary ? (
          <Text style={pdfStyles.leadText}>{report.market.executiveSummary}</Text>
        ) : null}
        {report.market.keyFindings.length > 0 ? (
          <>
            <PdfSectionHeader title={EQC_REPORT_COPY.sectionMarketFindings} />
            {report.market.keyFindings.map((finding, i) => (
              <Text key={`mf-${i}`} style={pdfStyles.bodyText}>
                {i + 1}. {finding}
              </Text>
            ))}
          </>
        ) : null}
        {report.market.implications ? (
          <Text style={pdfStyles.bodyText}>{report.market.implications}</Text>
        ) : null}
      </View>
    );
  }

  const citationRows = flattenCitationRows(report);
  pages = pushContent(
    pages,
    'geo',
    <View>
      <PdfSectionHeader title={EQC_REPORT_COPY.sectionGeoCheck} />
      <GeoStatusBanner report={report} />
      {(report.geo.geoFitnessScore != null || report.geo.overallScore != null) && (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.sectionGeoMetrics} />
          <PdfStatGrid
            items={[
              ...(report.geo.overallScore != null
                ? [{ label: EQC_REPORT_COPY.kpiShareOfVoice, value: `${Math.round(report.geo.overallScore)}%` }]
                : []),
              ...(report.geo.geoFitnessScore != null
                ? [{ label: EQC_REPORT_COPY.kpiGeoFitness, value: `${Math.round(report.geo.geoFitnessScore)}%` }]
                : []),
            ]}
          />
        </>
      )}
      {report.geo.eeatDimensions.length > 0 ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.sectionGeoEeat} />
          <EeatBarsPdf dimensions={report.geo.eeatDimensions} />
        </>
      ) : null}
      {report.geo.questions.length > 0 ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.sectionGeoQuestions} />
          {report.geo.questions.map((q, i) => (
            <Text key={i} style={pdfStyles.bodyText}>
              {i + 1}. {q}
            </Text>
          ))}
        </>
      ) : null}
      {citationRows.length > 0 ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.sectionCitations} />
          {toPdfDataTable(
            ['Modell', EQC_REPORT_COPY.colQuery, EQC_REPORT_COPY.colDomain, EQC_REPORT_COPY.colPosition],
            citationRows
          )}
        </>
      ) : null}
      {report.geo.recommendations.length > 0 ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.sectionGeoRecommendations} />
          {report.geo.recommendations.map((r, i) => (
            <PdfRecommendationRow
              key={`geo-rec-${i}`}
              title={[r.priority != null ? `[P${r.priority}]` : null, r.title].filter(Boolean).join(' ')}
              description={r.description}
            />
          ))}
        </>
      ) : null}
    </View>
  );

  pages = pushContent(
    pages,
    'insights',
    <View>
      <PdfSectionHeader title={EQC_REPORT_COPY.sectionInsights} />
      {report.insights?.findings.length ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.sectionFindings} />
          {report.insights.findings.map((f, i) => (
            <PdfRecommendationRow
              key={`f-${i}`}
              title={f.severity ? `[${eqcSeverityLabel(f.severity)}] ${f.title}` : f.title}
              description={f.description}
            />
          ))}
        </>
      ) : null}
      {report.insights?.recommendations.length ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.sectionRecommendations} />
          {report.insights.recommendations.map((r, i) => (
            <PdfRecommendationRow
              key={`r-${i}`}
              title={[r.priority != null ? `[P${r.priority}]` : null, r.title].filter(Boolean).join(' ')}
              description={r.description}
            />
          ))}
        </>
      ) : null}
    </View>
  );

  pages = pushContent(
    pages,
    'appendix',
    <View>
      <PdfSectionHeader title={EQC_REPORT_COPY.sectionAppendix} />
      {report.workflow.steps.length > 0 ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.appendixSteps} />
          {toPdfDataTable(
            report.appendix.stepTable.columns,
            report.appendix.stepTable.rows.map((row) => row as Array<string | number | null>)
          )}
        </>
      ) : null}
      {report.appendix.links.length > 0 ? (
        <>
          <PdfSectionHeader title={EQC_REPORT_COPY.links} />
          {report.appendix.links.map((link, i) => (
            <Text key={i} style={pdfStyles.metaText}>
              {link.label}: {link.href}
            </Text>
          ))}
        </>
      ) : null}
      {report.appendix.scanId || report.appendix.geoJobId ? (
        <Text style={[pdfStyles.metaText, { marginTop: 8 }]}>
          {report.appendix.scanId ? `Scan-ID: ${report.appendix.scanId}` : ''}
          {report.appendix.geoJobId ? ` · GEO-Job: ${report.appendix.geoJobId}` : ''}
        </Text>
      ) : null}
    </View>
  );

  return applyReportFooters(pages, {
    title: report.meta.title,
    locale: 'de',
    skipFooter: (_page, index) => index === 0,
  });
}

export function EventQuickCheckReportPdfDocument({ report }: { report: EventQuickCheckReportModel }) {
  const pages = buildEventQuickCheckReportPages(report);
  return <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT}>{pages}</Document>;
}

/** @deprecated use buildEventQuickCheckReportPages */
export function renderEventQuickCheckReportPdfPages(report: EventQuickCheckReportModel): React.ReactElement[] {
  return buildEventQuickCheckReportPages(report);
}

export function renderEventQuickCheckReportPdf(report: EventQuickCheckReportModel): React.ReactElement {
  return <EventQuickCheckReportPdfDocument report={report} />;
}
