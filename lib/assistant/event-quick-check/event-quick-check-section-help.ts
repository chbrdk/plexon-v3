/** Erklärungstexte für Quick-Check-Dashboard-Kapitel (Info-Tooltips). */
export const EQC_SECTION_HELP = {
  overview:
    'Kurzüberblick zum Quick Check: analysierte Domain, Projekt, Datum und eine zusammengefasste Einschätzung mit optionalem Fazit.',
  kpi: 'Die wichtigsten Kennzahlen aus Domain-Scan, Persona und GEO auf einen Blick — z. B. Domain-Score, Sichtbarkeitsanteil oder Persona-Konfidenz.',
  domain:
    'Technischer Domain-Scan: Qualitäts-Score, Fehler- und Warnungszahlen sowie die häufigsten Probleme aus CHECKION.',
  domainComparison:
    'Vergleich eigener Domain und Wettbewerber nach Deep Scan (Komplettscan) — Scores und Seitenzahlen nebeneinander.',
  persona:
    'Synthetische Zielgruppen-Persona aus AUDION: Profil, Bio, Eigenschaften, Ziele, Schmerzpunkte und persona-bezogene GEO-Fragen.',
  geo: 'GEO- und Wettbewerbsanalyse: Sichtbarkeit in LLM-Antworten, E-E-A-T-Bewertung, Zitierungen nach Modell und Handlungsempfehlungen.',
  market:
    'Externe Markt-Intelligence aus ECHON: Branchen-Trends, Signale und Waves — parallel zum technischen Check gestartet.',
  insights:
    'KI-generierte Quer-Einschätzung: Erkenntnisse aus allen Schritten plus priorisierte Handlungsempfehlungen für die nächsten Maßnahmen.',
  appendix:
    'Technischer Anhang mit Scan- und Job-IDs, detailliertem Workflow-Protokoll und Deep-Links zu CHECKION bzw. PLEXON.',
} as const;

export type EqcSectionHelpKey = keyof typeof EQC_SECTION_HELP;

export function eqcSectionHelpAriaLabel(sectionTitle: string): string {
  return `Erklärung: ${sectionTitle}`;
}
