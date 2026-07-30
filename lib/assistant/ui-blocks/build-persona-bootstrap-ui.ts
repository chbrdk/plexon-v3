import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { PersonaProfilePreview } from '@/lib/integrations/parse-audion-persona-profile';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export type PersonaPreviewItem = {
  id: string;
  name: string;
  segment: string;
  confidence: number;
  headline: string;
  profile?: PersonaProfilePreview;
  targetGroupId?: string;
  targetGroupName?: string;
};

export type PersonaTargetGroupRef = {
  id: string;
  name: string;
  segment: string;
};

export type PersonaBootstrapPreview = {
  projectId: string;
  projectName: string;
  targetGroupId: string;
  targetGroupName: string;
  persona?: PersonaPreviewItem;
  /** Complete scan: one persona per derived buyer segment. */
  personas?: PersonaPreviewItem[];
  targetGroups?: PersonaTargetGroupRef[];
  error?: string;
};

export function buildPersonaBootstrapLayout(input: PersonaBootstrapPreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const targetGroups = input.targetGroups?.length
    ? input.targetGroups
    : [
        {
          id: input.targetGroupId,
          name: input.targetGroupName,
          segment: input.targetGroupName,
        },
      ];

  const tg = createUiBlock(
    'target_group_card',
    {
      title: targetGroups.length > 1 ? 'Zielgruppen' : 'Zielgruppe',
      targetGroups: targetGroups.map((group) => ({
        id: group.id,
        name: group.name,
        segment: group.segment,
        personaCount: input.personas?.filter((p) => p.targetGroupId === group.id).length ?? (input.persona ? 1 : 0),
        knowledgeEntryCount: 0,
      })),
    },
    randomUUID()
  );
  if (tg.ok) blocks.push(tg.block);

  const personaCards = input.personas?.length
    ? input.personas
    : input.persona
      ? [input.persona]
      : [];
  if (personaCards.length > 0) {
    const p = createUiBlock(
      'persona_card',
      {
        title: personaCards.length > 1 ? 'Personas' : 'Persona',
        personas: personaCards.map((persona) => ({
          id: persona.id,
          name: persona.name,
          segment: persona.segment,
          confidence: persona.confidence,
          headline: persona.headline,
        })),
      },
      randomUUID()
    );
    if (p.ok) blocks.push(p.block);
  }

  const kv = createUiBlock(
    'key_value_list',
    {
      items: [
        { label: 'Projekt', value: input.projectName },
        { label: 'Projekt-ID', value: input.projectId },
      ],
    },
    randomUUID()
  );
  if (kv.ok) blocks.push(kv.block);

  if (input.error) {
    const alert = createUiBlock('alert', { message: input.error, tone: 'warning' }, randomUUID());
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
