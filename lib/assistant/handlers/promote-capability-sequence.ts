/**
 * Intent: promote recent chat capability trace → Collection Flow or Playbook recipe (Wave C3).
 */

import { randomUUID } from 'crypto';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import {
  emitPhase,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';
import {
  buildPlaybookRecipe,
  buildPromotedFlowDocument,
  extractPromoteTraceFromHistory,
  persistPromotedFlow,
} from '@/lib/capabilities/promote';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import { buildUiLayoutFromBlocks } from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';

export const handlePromoteCapabilitySequenceIntent: IntentHandler<
  'promote_capability_sequence'
> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'promote_capability_sequence');

  if (!ctx.platformProjectId) {
    return {
      assistantText:
        '## Collection wählen\n\nBitte wähle eine Collection, bevor ich einen Flow oder ein Rezept speichere.',
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const history = [
    ...ctx.history,
    { role: 'user' as const, content: ctx.prompt, metadata: null },
  ];
  const steps = extractPromoteTraceFromHistory(history);
  if (!steps.length) {
    return {
      assistantText:
        '## Nichts zu speichern\n\nIn dieser Conversation finde ich keinen promotbaren Lauf (z. B. Scan/GEO) und kein Explore-Rezept (Persona × Marke).',
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  // Prefer flow build; fall back to playbook
  const flowBuild = buildPromotedFlowDocument(steps, { name: intent.name });
  if (flowBuild.ok) {
    const preview = flowBuild.preview;
    if (!intent.confirm) {
      const alert = createUiBlock(
        'alert',
        {
          message: `Flow-Vorschau: ${preview.nodeLabels.join(' → ')}`,
          tone: 'info',
        },
        randomUUID()
      );
      return {
        assistantText: [
          '## Flow speichern — Vorschau',
          '',
          `**Name:** ${preview.name}`,
          `**Knoten:** ${preview.nodeLabels.join(' → ')}`,
          preview.exploreCapabilityIds.length
            ? `\n_Explore-Schritte bleiben Chat-only:_ ${preview.exploreCapabilityIds.join(', ')}`
            : '',
          '',
          'Bestätige mit „Flow speichern bestätigen“ (optional mit Namen).',
        ].join('\n'),
        metadata: {
          contentType: alert.ok
            ? ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED
            : ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
          promotePreview: {
            target: 'flow',
            name: preview.name,
            capabilityIds: preview.capabilityIds,
            nodeLabels: preview.nodeLabels,
          },
          followUpPrompts: [
            {
              id: 'confirm-promote-flow',
              label: 'Flow speichern bestätigen',
              prompt: `Flow speichern bestätigen als „${preview.name}“`,
            },
          ],
          ...(alert.ok ? { uiLayout: buildUiLayoutFromBlocks([alert.block]) } : {}),
        },
      };
    }

    const saved = await persistPromotedFlow({
      platformProjectId: ctx.platformProjectId,
      name: intent.name?.trim() || preview.name,
      doc: preview.doc,
      ownerId: ctx.user.id,
    });
    if (!saved.ok) {
      return {
        assistantText: `## Speichern fehlgeschlagen\n\n${saved.error}`,
        metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
      };
    }

    await recordAssistantUsageEvent({
      userId: ctx.user.id,
      eventType: 'workflow_run',
      rawUnits: { workflow: 'promote_capability_sequence', target: 'flow' },
    });

    const alert = createUiBlock(
      'alert',
      { message: `Flow „${saved.flow.name}“ angelegt`, tone: 'success' },
      randomUUID()
    );
    return {
      assistantText: [
        `## Flow gespeichert`,
        '',
        `**${saved.flow.name}**`,
        `Board: ${saved.boardPath}`,
        '',
        'Du kannst ihn mit „Starte Flow …“ ausführen.',
      ].join('\n'),
      metadata: {
        contentType: alert.ok
          ? ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED
          : ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
        promotedFlow: { id: saved.flow.id, boardPath: saved.boardPath },
        followUpPrompts: [
          {
            id: 'run-promoted-flow',
            label: 'Flow jetzt starten',
            prompt: `Starte Flow ${saved.flow.id}`,
          },
        ],
        ...(alert.ok ? { uiLayout: buildUiLayoutFromBlocks([alert.block]) } : {}),
      },
    };
  }

  const playbook = buildPlaybookRecipe(steps, { title: intent.name });
  if (!playbook.ok) {
    return {
      assistantText: `## Promote abgelehnt\n\n**${playbook.code}:** ${playbook.message}`,
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const recipe = playbook.recipe;
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'promote_capability_sequence', target: 'playbook' },
  });

  const alert = createUiBlock(
    'alert',
    {
      message: recipe.notes,
      tone: 'info',
    },
    randomUUID()
  );

  return {
    assistantText: [
      '## Als Chat-Rezept speichern (kein Flow)',
      '',
      `**${recipe.title}**`,
      '',
      recipe.notes,
      '',
      'Vorschlag für den nächsten Lauf:',
      `> ${recipe.prompt}`,
    ].join('\n'),
    metadata: {
      contentType: alert.ok
        ? ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED
        : ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
      promotePlaybook: recipe,
      followUpPrompts: [
        {
          id: 'rerun-playbook-recipe',
          label: 'Rezept ausführen',
          prompt: recipe.prompt,
        },
      ],
      ...(alert.ok ? { uiLayout: buildUiLayoutFromBlocks([alert.block]) } : {}),
    },
  };
};
