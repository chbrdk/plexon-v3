/**
 * Pre-flight checks before Collection Flow Testen (Wave 12).
 * Closed catalog only — no free expressions.
 * @see specs/domain/collection-test-flow.md — Wave 12
 */

import {
  documentHasJourneySegment,
  extractJourneyFlowFromDocument,
  listJourneyPersonaSlots,
  startNodeUrl,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import { isCatalogPath } from '@/lib/collection-flow-run-context';

export type CollectionFlowValidationIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
  nodeId?: string;
};

export type CollectionFlowValidationResult = {
  ok: boolean;
  issues: CollectionFlowValidationIssue[];
};

export function validateCollectionFlowForRun(
  doc: CollectionTestFlowDocument
): CollectionFlowValidationResult {
  const issues: CollectionFlowValidationIssue[] = [];
  const start = doc.nodes.find((n) => n.kind === 'start');
  if (!start) {
    issues.push({
      level: 'error',
      code: 'missing_start',
      message: 'Flow braucht einen Start-Node.',
    });
  }

  const url = startNodeUrl(doc.nodes) ?? '';
  if (start && !url.trim()) {
    issues.push({
      level: 'error',
      code: 'missing_url',
      message: 'Start braucht eine URL / urlKey.',
      nodeId: start.id,
    });
  }

  for (const n of doc.nodes) {
    if (n.kind !== 'compare') continue;
    const path = n.path?.trim() ?? '';
    if (!path) {
      issues.push({
        level: 'error',
        code: 'compare_missing_path',
        message: `Compare „${n.label || n.id}“ braucht einen Wert (catalog path).`,
        nodeId: n.id,
      });
      continue;
    }
    if (!isCatalogPath(path)) {
      issues.push({
        level: 'error',
        code: 'compare_invalid_path',
        message: `Compare „${n.label || n.id}“: „${path}“ ist kein geschlossener Catalog-Pfad.`,
        nodeId: n.id,
      });
    }
  }

  for (const n of doc.nodes) {
    if (n.kind !== 'persona') continue;
    if (!n.personaId?.trim()) {
      issues.push({
        level: 'warning',
        code: 'persona_unset',
        message: `Persona „${n.label || n.id}“: noch keine Persona aus dem Catalog gewählt.`,
        nodeId: n.id,
      });
    }
  }

  const parallelSlots = listJourneyPersonaSlots(doc).filter((s) => s.via === 'parallel');
  for (const slot of parallelSlots) {
    if (!slot.personaId) {
      issues.push({
        level: 'error',
        code: 'parallel_persona_unset',
        message: `Parallel-Persona „${slot.personaName || slot.nodeId}“ braucht eine Catalog-Persona.`,
        nodeId: slot.nodeId,
      });
    }
  }

  if (documentHasJourneySegment(doc)) {
    const extracted = extractJourneyFlowFromDocument(doc, url || 'https://example.com');
    if (!extracted?.compileReady) {
      issues.push({
        level: 'error',
        code: 'journey_not_ready',
        message: 'Journey-Segment ist nicht compile-ready (Start + Schritte + Kanten prüfen).',
      });
    }
  }

  const errors = issues.filter((i) => i.level === 'error');
  return { ok: errors.length === 0, issues };
}

export function formatValidationIssues(issues: CollectionFlowValidationIssue[]): string {
  return issues.map((i) => `${i.level === 'error' ? '✗' : '⚠'} ${i.message}`).join('\n');
}
