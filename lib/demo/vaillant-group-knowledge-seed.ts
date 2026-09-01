/**
 * Vaillant Group UC1 — research brief + ECHON hypothesis seed (Knowledge Pack facet data).
 * Collection: VAILLANT_GROUP_PLATFORM_PROJECT_ID only.
 */

import type { ResearchBriefData } from '@/lib/collection-knowledge-pack';
import {
  VAILLANT_GROUP_B2C_TOUCHPOINT_URL,
  VAILLANT_GROUP_COLLECTION_NAME,
  VAILLANT_GROUP_CORPORATE_URL,
} from '@/lib/demo/vaillant-group-mafo';

export const VAILLANT_GROUP_UC1_BUSINESS_QUESTION =
  'Warum entscheidet sich ein Eigenheimbesitzer gegen eine Wärmepumpe?' as const;

export const VAILLANT_GROUP_UC1_HYPOTHESES = [
  'Eine Wärmepumpe funktioniert in meinem Altbau nicht.',
  'Die Investition ist zu hoch.',
  'Ich kann zukünftige Stromkosten nicht einschätzen.',
  'Förderung ist zu kompliziert.',
  'Ich weiß nicht, wem ich vertrauen kann.',
  'Ich finde keinen geeigneten Installateur.',
] as const;

export const VAILLANT_GROUP_UC1_SPIRION_CLUSTERS = [
  'Cost',
  'Complexity',
  'Trust',
  'Planning uncertainty',
  'Technical feasibility',
  'Installer availability',
  'Funding uncertainty',
  'Operating cost uncertainty',
] as const;

export const VAILLANT_GROUP_UC2_BUSINESS_QUESTION =
  'Was braucht der Fachhandwerker, damit er Vaillant empfiehlt?' as const;

export const VAILLANT_GROUP_UC2_CUSTOMER_NEEDS = [
  'Passt die Wärmepumpe überhaupt zu meinem Haus?',
  'Was kostet mich das langfristig?',
  'Kann ich mich auf die Technik verlassen?',
  'Wer hilft mir bei Problemen?',
  'Wie kompliziert wird der Umbau?',
] as const;

export const VAILLANT_GROUP_UC2_INSTALLER_NEEDS = [
  'Einfache Planung',
  'Schnelle Installation',
  'Zuverlässige Inbetriebnahme',
  'Geringe Servicekomplexität',
  'Gute Diagnosemöglichkeiten',
  'Sichere Produktempfehlung',
  'Verständliche Kundenberatung',
  'Kalkulierbarer Projektaufwand',
] as const;

export const VAILLANT_GROUP_UC2_OPPORTUNITIES = [
  'Gemeinsame Planung — Endkunde braucht Eignung, Installateur valide Planungsdaten',
  'Bessere Beratung — Endkunde braucht Wirtschaftlichkeit, Installateur muss sie erklären',
  'Vertrauen & Service — Endkunde braucht Zuverlässigkeit, Installateur wenig Serviceaufwand',
  'Remote Support — Endkunde braucht Hilfe später, Installateur kann nicht überall hinfahren',
  'Geführte Journey — Endkunde braucht Klarheit, Installateur will Prozesse vereinfachen',
] as const;

export function buildVaillantGroupResearchBriefSeed(): ResearchBriefData {
  return {
    summary: `${VAILLANT_GROUP_COLLECTION_NAME} · MaFo UC1+UC2 — Kaufbarrieren & Fachhandwerker-Dual-Perspektive.`,
    topics: [
      'Wärmepumpe',
      'Eigenheim',
      'Kaufbarrieren',
      'Förderung',
      'Installateur',
      'Fachhandwerker',
      'Opportunity Map',
    ],
    sourceRunId: null,
    sourceProjectId: null,
    sections: [
      {
        id: 'uc1-question',
        title: 'Business-Frage',
        plainText: VAILLANT_GROUP_UC1_BUSINESS_QUESTION,
        bullets: [
          'Ist der Preis die größte Barriere?',
          'Zweifel an Eignung für Bestandsgebäude?',
          'Unsicherheit bei Stromkosten und Förderung?',
          'Welche Rolle spielt der Fachhandwerker?',
        ],
      },
      {
        id: 'uc1-hypotheses',
        title: 'Research-Hypothesen (ECHON → AUDION)',
        plainText: 'Erste Hypothesen aus Markt- und Kontextrecherche.',
        bullets: [...VAILLANT_GROUP_UC1_HYPOTHESES],
      },
      {
        id: 'uc1-touchpoints',
        title: 'Touchpoints',
        plainText: `Corporate: ${VAILLANT_GROUP_CORPORATE_URL} · B2C Research: ${VAILLANT_GROUP_B2C_TOUCHPOINT_URL}`,
        bullets: [
          'CREATION: Insight-Landing-Varianten (Kosten, Eignung, 3 Schritte)',
          'CHECKION: Scan vaillant.de + CREATION Preview',
          'SPIRION: Cluster über AUDION-Transkripte',
        ],
      },
      {
        id: 'uc1-clusters',
        title: 'SPIRION Cluster (Ziel)',
        plainText: 'Erwartete Muster-Dimensionen nach Qual-Research.',
        bullets: [...VAILLANT_GROUP_UC1_SPIRION_CLUSTERS],
      },
      {
        id: 'uc2-question',
        title: 'UC2 · Business-Frage',
        plainText: VAILLANT_GROUP_UC2_BUSINESS_QUESTION,
        bullets: [
          'Welche Faktoren bestimmen die Produktempfehlung?',
          'Endkunden- vs. Installateur-Perspektive verbinden',
        ],
      },
      {
        id: 'uc2-customer-needs',
        title: 'UC2 · Endkundenperspektive (AUDION)',
        plainText: 'Typische Bedürfnisse entlang der Empfehlungsentscheidung.',
        bullets: [...VAILLANT_GROUP_UC2_CUSTOMER_NEEDS],
      },
      {
        id: 'uc2-installer-needs',
        title: 'UC2 · Fachhandwerkerperspektive (AUDION)',
        plainText: 'Anforderungen an Planung, Installation und Beratung.',
        bullets: [...VAILLANT_GROUP_UC2_INSTALLER_NEEDS],
      },
      {
        id: 'uc2-opportunity-map',
        title: 'UC2 · Opportunity Map (SPIRION)',
        plainText: 'Customer Need × Installer Need × Vaillant Capability',
        bullets: [...VAILLANT_GROUP_UC2_OPPORTUNITIES],
      },
    ],
  };
}
