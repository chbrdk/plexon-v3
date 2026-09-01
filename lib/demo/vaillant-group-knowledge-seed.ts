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

export function buildVaillantGroupResearchBriefSeed(): ResearchBriefData {
  return {
    summary: `${VAILLANT_GROUP_COLLECTION_NAME} · MaFo UC1 — Kaufbarrieren Wärmepumpe (Eigenheimbesitzer).`,
    topics: ['Wärmepumpe', 'Eigenheim', 'Kaufbarrieren', 'Förderung', 'Installateur'],
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
    ],
  };
}
