import type {
  EventQuickCheckReportModel,
  EventQuickCheckReportPersonaSection,
} from '@/lib/assistant/reports/event-quick-check-report-types';

/** Prefer multi-persona list; fall back to single `persona`. */
export function resolveReportPersonas(
  report: Pick<EventQuickCheckReportModel, 'persona' | 'personas'>
): EventQuickCheckReportPersonaSection[] {
  if (report.personas?.length) return report.personas;
  if (report.persona) return [report.persona];
  return [];
}
