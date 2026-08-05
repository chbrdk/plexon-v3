/**
 * Collection Test Flow → Audion wave / Knowledge Pack rollup (Wave 4).
 * Spec: specs/domain/collection-test-flow.md
 */

import type { CollectionVerdict } from '@/lib/collection-test-flow';
import type { ResearchSection } from '@/lib/collection-knowledge-pack';

export const COLLECTION_FLOW_KP_SECTION_ID = 'collection-test-flow-latest' as const;

export type CollectionCrossProductRates = {
  taskCompleted: 0 | 1;
  pageEvidenceValid: 0 | 1;
  qualityPassed: 0 | 1;
  collectionReady: 0 | 1;
  validEvidence: 0 | 1;
  scorePassed: 0 | 1;
  issueGatePassed: 0 | 1;
};

export function collectionCrossProductRates(
  verdict: CollectionVerdict
): CollectionCrossProductRates {
  const bit = (v: boolean): 0 | 1 => (v ? 1 : 0);
  return {
    taskCompleted: bit(verdict.taskCompleted),
    pageEvidenceValid: bit(verdict.pageEvidenceValid),
    qualityPassed: bit(verdict.qualityPassed),
    collectionReady: bit(verdict.collectionReady),
    validEvidence: bit(verdict.validEvidence),
    scorePassed: bit(verdict.scorePassed),
    issueGatePassed: bit(verdict.issueGatePassed),
  };
}

export function formatCollectionRateLines(rates: CollectionCrossProductRates): string[] {
  return [
    `Collection taskCompleted=${rates.taskCompleted}`,
    `Collection pageEvidenceValid=${rates.pageEvidenceValid}`,
    `Collection scorePassed=${rates.scorePassed}`,
    `Collection issueGatePassed=${rates.issueGatePassed}`,
    `Collection qualityPassed=${rates.qualityPassed}`,
    `Collection validEvidence=${rates.validEvidence}`,
    `Collection collectionReady=${rates.collectionReady}`,
  ];
}

/** Soft-Q notes lines (appended after Audion evaluate notes). */
export function buildCollectionSoftQNotes(input: {
  verdict: CollectionVerdict;
  flowId: string;
  scanId?: string | null;
  overallScore?: number | null;
}): string[] {
  const rates = collectionCrossProductRates(input.verdict);
  const lines = [
    '--- Collection Test Flow rollup ---',
    `flowId=${input.flowId}`,
    input.verdict.summary,
    `terminal=${input.verdict.terminalKind ?? 'none'}`,
    ...formatCollectionRateLines(rates),
  ];
  if (input.overallScore != null) {
    lines.push(`overallScore=${input.overallScore} (threshold ${input.verdict.threshold})`);
  }
  if (input.scanId) lines.push(`checkionScanId=${input.scanId}`);
  if (input.verdict.criticalCount != null) {
    lines.push(`criticalCount=${input.verdict.criticalCount}`);
  }
  return lines;
}

export function buildCollectionReportMarkdown(input: {
  verdict: CollectionVerdict;
  flowId: string;
  platformProjectId: string;
  scanId?: string | null;
  stepUrl?: string | null;
  overallScore?: number | null;
  priorReport?: string | null;
}): string {
  const rates = collectionCrossProductRates(input.verdict);
  const section = [
    '## Collection Test Flow',
    '',
    input.verdict.summary,
    '',
    `| Signal | Value |`,
    `| --- | --- |`,
    `| collectionReady | ${rates.collectionReady} |`,
    `| taskCompleted | ${rates.taskCompleted} |`,
    `| pageEvidenceValid | ${rates.pageEvidenceValid} |`,
    `| qualityPassed | ${rates.qualityPassed} |`,
    `| validEvidence | ${rates.validEvidence} |`,
    `| scorePassed | ${rates.scorePassed} |`,
    `| issueGatePassed | ${rates.issueGatePassed} |`,
    `| overallScore | ${input.overallScore ?? '—'} / ${input.verdict.threshold} |`,
    `| flowId | \`${input.flowId}\` |`,
    `| platformProjectId | \`${input.platformProjectId}\` |`,
    input.scanId ? `| checkionScanId | \`${input.scanId}\` |` : null,
    input.stepUrl ? `| stepUrl | ${input.stepUrl} |` : null,
    '',
    '_Soft-Q scores remain Audion Evaluate output; Collection does not invent Soft-Q values._',
  ]
    .filter((line): line is string => line != null)
    .join('\n');

  const prior = input.priorReport?.trim();
  if (!prior) return section;
  // Replace prior Collection section if present; otherwise append.
  const stripped = prior.replace(
    /\n*## Collection Test Flow[\s\S]*?(?=\n## |\n*$)/,
    ''
  );
  return `${stripped.trim()}\n\n${section}`.trim();
}

export function buildCollectionKnowledgeSection(input: {
  verdict: CollectionVerdict;
  flowId: string;
  scanId?: string | null;
  overallScore?: number | null;
}): ResearchSection {
  const rates = collectionCrossProductRates(input.verdict);
  return {
    id: COLLECTION_FLOW_KP_SECTION_ID,
    title: 'Collection Test Flow',
    plainText: [
      input.verdict.summary,
      `flowId=${input.flowId}`,
      input.scanId ? `scanId=${input.scanId}` : null,
      input.overallScore != null ? `overallScore=${input.overallScore}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    bullets: formatCollectionRateLines(rates),
  };
}

/** Merge Collection notes after existing Soft-Q / evaluate notes (dedupe marker block). */
export function mergeEvaluationNotes(
  existing: string[] | null | undefined,
  collectionNotes: string[]
): string[] {
  const prior = Array.isArray(existing) ? [...existing] : [];
  const marker = '--- Collection Test Flow rollup ---';
  const idx = prior.findIndex((n) => n === marker);
  if (idx >= 0) {
    return [...prior.slice(0, idx), ...collectionNotes];
  }
  return [...prior, ...collectionNotes];
}
