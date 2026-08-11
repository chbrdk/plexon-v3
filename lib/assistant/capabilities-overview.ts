/** Central copy for the assistant capabilities overview (UI + short fallback text). */

import {
  QUICK_CHECK_LABEL,
  QUICK_CHECK_PROMPT_EN,
} from '@/lib/assistant/event-quick-check/quick-check-label';

export type CapabilityRow = {
  name: string;
  description: string;
};

export type CapabilitySection = {
  id: string;
  title: string;
  rows?: CapabilityRow[];
  bullets?: string[];
};

export const ASSISTANT_CAPABILITIES_TITLE = 'PLEXON-Assistent – Übersicht';

export const ASSISTANT_CAPABILITIES_INTRO =
  'Ich bin dein zentraler Assistent für die MSQDX-Produktfamilie. Hier ist, was ich für dich tun kann:';

export const ASSISTANT_CAPABILITIES_SECTIONS: CapabilitySection[] = [
  {
    id: 'checkion',
    title: 'CHECKION – SEO, Scans & Accessibility',
    rows: [
      { name: 'Einzel-Scan', description: 'Accessibility- & UX-Scan einer Seite (Desktop, Tablet, Mobile)' },
      { name: 'Domain-Scan', description: 'Tiefenanalyse einer ganzen Domain' },
      { name: 'GEO / E-E-A-T', description: 'Technische + KI-Analyse für Sichtbarkeit in LLM-Suchen' },
      { name: 'PageSpeed', description: 'Performance-, Accessibility- & SEO-Score via Google PageSpeed' },
      { name: 'SSL-Check', description: 'SSL-Zertifikat & Sicherheits-Grade prüfen' },
      { name: 'Kontrastprüfung', description: 'WCAG-Kontrastverhältnis zweier Farben' },
      { name: 'Journey Agent', description: 'KI-gesteuerte UX-Journey auf einer Website' },
      { name: 'Screenshots & Heatmaps', description: 'Saliency/Heatmap-Analyse für gescannte Seiten' },
      { name: 'Lesbarkeit', description: 'Flesch-Kincaid-Lesbarkeitsindex für Texte' },
      { name: 'Sharing', description: 'Scan-Ergebnisse per Link teilen (optional passwortgeschützt)' },
    ],
  },
  {
    id: 'audion',
    title: 'AUDION – Personas & Target Groups',
    rows: [
      { name: 'Personas generieren', description: 'KI-gestützte Persona-Erstellung für Zielgruppen' },
      { name: 'Target Groups', description: 'Zielgruppen anlegen, verwalten & mit Wissen anreichern' },
      {
        name: 'Customer Journeys',
        description: 'Journeys generieren, validieren & anreichern',
      },
      {
        name: 'Journey Outline',
        description:
          'Phasen + Moments im Chat anzeigen (Phase anklickbar; optional Validate)',
      },
      {
        name: 'Journey generieren',
        description: 'Neue Customer Journey in AUDION anlegen und Outline + Validate zeigen',
      },
      { name: 'Website-Research', description: 'Automatische Website-Analyse für Projektkontext' },
      { name: 'AI Assist', description: 'KI-Templates für Persona, Journey & mehr' },
      { name: 'Dokumente & Knowledge', description: 'Wissen für Zielgruppen hinterlegen & clustern' },
    ],
  },
  {
    id: 'playbooks',
    title: 'Playbooks & Launch',
    rows: [
      {
        name: 'Website-Audit',
        description:
          'Verkettet PageSpeed, WCAG-Scan, SSL, Lesbarkeit — optional GEO, Security Headers (Mozilla Observatory) & DNS',
      },
      {
        name: 'Launch Readiness',
        description:
          'Cross-Product-Onboarding: Projekt, Sync, Research, Light-Audit, Persona-Bootstrap und Ampel-Report',
      },
      {
        name: QUICK_CHECK_LABEL,
        description:
          'Schnellcheck für Events: Research + 50-Seiten-Scan parallel, AUDION-Persona, 3 GEO-Fragen und Competitive-Check',
      },
      {
        name: 'Markt → Zielgruppen',
        description:
          'ECHON Markt-Research, Ableitung und Anlage von AUDION-Zielgruppen (Projektkontext mit audionProjectId)',
      },
    ],
    bullets: [
      'Composer-Chips: Website-Audit, Domain Deep Scan, SSL-Check, Launch Readiness, Quick Check',
      'Mit Projektkontext werden CHECKION-Scans und GEO-Jobs automatisch dem CHECKION-Projekt zugeordnet',
    ],
  },
  {
    id: 'projects',
    title: 'Projekte & Verwaltung',
    bullets: [
      'Plattform-Projekte anlegen (PLEXON-first) und nach CHECKION & AUDION synchronisieren',
      'Projekt nur in AUDION oder nur in CHECKION anlegen (ohne Plattform-Sync)',
      'Accessibility-Scan und PageSpeed per Intent-Workflow mit UI-Karten',
      'Website-Audit und Launch-Readiness Playbooks mit Gesamt-Report',
      'Research starten (Keywords, Competitors, GEO in CHECKION; Website-Analyse in AUDION)',
      'Persona-Bootstrap: Projekt + Zielgruppe + Persona in AUDION',
      'Sync-Diagnose bei fehlgeschlagenem Produkt-Sync',
      'Status & Zusammenfassungen laufender oder abgeschlossener Analysen',
    ],
  },
];

export const ASSISTANT_CAPABILITIES_EXAMPLES = [
  'Website audit https://example.com',
  'Launch readiness für "Acme" https://example.com',
  QUICK_CHECK_PROMPT_EN,
  'Deep scan https://example.com',
  'SSL Check für https://example.com',
  'Scanne https://example.com auf Accessibility-Probleme',
  'Erstelle ein neues Projekt für meine Website und starte Research',
  'Generiere Personas für die Zielgruppe „junge Eltern"',
  'Starte eine GEO/E-E-A-T Analyse mit Wettbewerbervergleich',
];

export const ASSISTANT_CAPABILITIES_FOOTER = 'Womit kann ich dir heute helfen?';

/** Short plain-text fallback stored in message.content for search/history. */
export function getAssistantCapabilitiesFallbackText(): string {
  return `${ASSISTANT_CAPABILITIES_TITLE}\n\n${ASSISTANT_CAPABILITIES_FOOTER}`;
}

export const ASSISTANT_MESSAGE_CONTENT_TYPE = {
  CAPABILITIES_OVERVIEW: 'capabilities_overview',
  MARKDOWN: 'markdown',
  UI_COMPOSED: 'ui_composed',
} as const;
