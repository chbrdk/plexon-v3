import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { resolveReportPersonas } from '@/lib/assistant/reports/resolve-report-personas';
import { hasDomainScanDistributions } from '@/lib/integrations/map-domain-scan-distributions';

export type EventQuickCheckDashboardLayout = {
  showDomain: boolean;
  showDistributions: boolean;
  showDomainComparison: boolean;
  showPersona: boolean;
  showGeoQuestions: boolean;
  showGeoMetrics: boolean;
  showGeoCompetitors: boolean;
  showGeoEeat: boolean;
  showGeoCitations: boolean;
  showGeoRecommendations: boolean;
  showInsights: boolean;
  showExecutiveFazit: boolean;
  showMarket: boolean;
  domainSpan: number;
  personaSpan: number;
  geoSpan: number;
};

export function resolveEventQuickCheckDashboardLayout(
  report: EventQuickCheckReportModel
): EventQuickCheckDashboardLayout {
  const showDomain = Boolean(report.domain);
  const showDistributions = hasDomainScanDistributions(report.distributions);
  const showDomainComparison = Boolean(report.domainComparison?.rows.length);
  const showPersona = resolveReportPersonas(report).length > 0;
  const showGeoQuestions = report.geo.questions.length > 0;
  const showGeoQuestionsInGeo = showGeoQuestions && !showPersona;
  const showGeoMetrics =
    report.geo.overallScore != null || report.geo.geoFitnessScore != null;
  const showGeoCompetitors = false;
  const showGeoEeat = report.geo.eeatDimensions.length > 0;
  const showGeoCitations =
    report.geo.citationHighlights.length > 0 ||
    (report.geo.citationHighlightsByModel?.length ?? 0) > 0;
  const showGeoRecommendations = report.geo.recommendations.length > 0;
  // Insights magazine shows verdict + findings; GEO owns the moves slideshow.
  const showInsights = Boolean(
    report.insights &&
      (report.insights.fazit ||
        report.insights.assessment ||
        report.insights.findings.length > 0)
  );
  const showExecutiveFazit = Boolean(report.executive.fazit);
  const showMarket = Boolean(
    report.market &&
      (report.market.status === 'complete' ||
        report.market.status === 'partial' ||
        report.market.status === 'failed' ||
        report.market.executiveSummary ||
        report.market.keyFindings.length > 0)
  );

  // Core GEO chapter excludes E-E-A-T + recommendations (own scrolly bands).
  const hasGeoCore =
    showGeoQuestionsInGeo ||
    showGeoMetrics ||
    showGeoCitations ||
    report.geo.competitors.length > 0 ||
    report.geo.status === 'failed' ||
    report.geo.status === 'partial';

  if (showPersona) {
    return {
      showDomain,
      showDistributions,
      showDomainComparison,
      showPersona,
      showGeoQuestions,
      showGeoMetrics,
      showGeoCompetitors,
      showGeoEeat,
      showGeoCitations,
      showGeoRecommendations,
      showInsights,
      showExecutiveFazit,
      showMarket,
      domainSpan: 12,
      personaSpan: hasGeoCore ? 5 : 12,
      geoSpan: hasGeoCore ? 7 : 0,
    };
  }

  return {
    showDomain,
    showDistributions,
    showDomainComparison,
    showPersona,
    showGeoQuestions,
    showGeoMetrics,
    showGeoCompetitors,
    showGeoEeat,
    showGeoCitations,
    showGeoRecommendations,
    showInsights,
    showExecutiveFazit,
    showMarket,
    domainSpan: 12,
    personaSpan: 12,
    geoSpan: hasGeoCore ? 12 : 0,
  };
}
