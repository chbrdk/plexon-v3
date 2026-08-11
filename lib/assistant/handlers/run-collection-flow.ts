/**
 * Intent: run / list Collection Flows from the platform Assistant (Wave C2).
 */

import { randomUUID } from 'crypto';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import {
  emitPhase,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';
import { executePlexonCollectionFlowRunCapability } from '@/lib/capabilities/executors/plexon-collection-flow-run';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import {
  buildUiLayoutFromBlocks,
  metadataWithWorkflowSteps,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import {
  emitWorkflowRunStarted,
  emitWorkflowStepsToStream,
  patchWorkflowSteps,
} from '@/lib/assistant/workflows/workflow-step-stream';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';

const INITIAL_STEPS: WorkflowStep[] = [
  { id: 'resolve', label: 'Flow auflösen', status: 'pending' },
  { id: 'execute', label: 'Flow ausführen', status: 'pending' },
  { id: 'report', label: 'Ergebnis', status: 'pending' },
];

export const handleRunCollectionFlowIntent: IntentHandler<'run_collection_flow'> = async (
  ctx,
  intent
) => {
  emitPhase(ctx.emit, 'workflow', 'run_collection_flow');

  if (!ctx.platformProjectId) {
    return {
      assistantText:
        '## Collection wählen\n\nBitte wähle eine Collection im Kontext-Dropdown, bevor ich einen Flow starte.',
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'run_collection_flow',
    steps: INITIAL_STEPS,
  });
  emitWorkflowRunStarted(ctx.emit, workflowRun.id, 'run_collection_flow');
  emitWorkflowStepsToStream(ctx.emit, INITIAL_STEPS, 'run_collection_flow', 'Collection Flow');

  let steps = INITIAL_STEPS;
  steps = await patchWorkflowSteps({
    runId: workflowRun.id,
    steps,
    stepId: 'resolve',
    patch: { status: 'running' },
    emit: ctx.emit,
    workflowType: 'run_collection_flow',
    title: 'Collection Flow',
  });

  const cap = await executePlexonCollectionFlowRunCapability(
    {
      platformProjectId: ctx.platformProjectId,
      flowId: intent.flowId,
      flowName: intent.flowName,
      url: intent.url,
      listOnly: intent.listOnly === true,
      updatedByUserId: ctx.user.id,
    },
    { source: 'agent', platformProjectId: ctx.platformProjectId }
  );

  if (!cap.ok && cap.agentPayload?.variant === 'list') {
    steps = await patchWorkflowSteps({
      runId: workflowRun.id,
      steps,
      stepId: 'resolve',
      patch: { status: 'done' },
      emit: ctx.emit,
      workflowType: 'run_collection_flow',
      title: 'Collection Flow',
    });
    steps = await patchWorkflowSteps({
      runId: workflowRun.id,
      steps,
      stepId: 'execute',
      patch: { status: 'done', detail: 'Auswahl nötig' },
      emit: ctx.emit,
      workflowType: 'run_collection_flow',
      title: 'Collection Flow',
    });
    steps = await patchWorkflowSteps({
      runId: workflowRun.id,
      steps,
      stepId: 'report',
      patch: { status: 'done' },
      emit: ctx.emit,
      workflowType: 'run_collection_flow',
      title: 'Collection Flow',
    });

    const flows = cap.agentPayload.flows;
    const lines =
      flows.length === 0
        ? ['Keine Flows vorhanden.']
        : flows.map((f, i) => `${i + 1}. **${f.name}** (\`${f.id}\`)`);
    const followUpPrompts = flows.slice(0, 5).map((f) => ({
      id: `run-flow-${f.id}`,
      label: `Starte Flow „${f.name}“`,
      prompt: `Starte Flow ${f.id}`,
    }));

    await updateAssistantWorkflowRun(workflowRun.id, { steps, status: 'complete' });
    await recordAssistantUsageEvent({
      userId: ctx.user.id,
      eventType: 'workflow_run',
      rawUnits: { workflow: 'run_collection_flow', outcome: 'picker' },
    });

    const alert = createUiBlock(
      'alert',
      {
        message: cap.error ?? 'Flow auswählen',
        tone: 'info',
      },
      randomUUID()
    );

    return {
      assistantText: `## Collection Flows\n\n${cap.error ?? 'Welchen Flow soll ich starten?'}\n\n${lines.join('\n')}`,
      workflowRunId: workflowRun.id,
      metadata: {
        contentType: alert.ok
          ? ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED
          : ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
        followUpPrompts,
        ...(alert.ok ? { uiLayout: buildUiLayoutFromBlocks([alert.block]) } : {}),
        ...metadataWithWorkflowSteps(steps, 'run_collection_flow'),
      },
    };
  }

  if (!cap.ok || cap.agentPayload?.variant !== 'run') {
    steps = await patchWorkflowSteps({
      runId: workflowRun.id,
      steps,
      stepId: 'resolve',
      patch: { status: 'error', detail: cap.error },
      emit: ctx.emit,
      workflowType: 'run_collection_flow',
      title: 'Collection Flow',
    });
    await updateAssistantWorkflowRun(workflowRun.id, { steps, status: 'error' });
    return {
      assistantText: `## Flow fehlgeschlagen\n\n${cap.error ?? 'Unbekannter Fehler'}`,
      workflowRunId: workflowRun.id,
      metadata: {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
        ...metadataWithWorkflowSteps(steps, 'run_collection_flow'),
      },
    };
  }

  const run = cap.agentPayload;
  steps = await patchWorkflowSteps({
    runId: workflowRun.id,
    steps,
    stepId: 'resolve',
    patch: { status: 'done', detail: run.flowName },
    emit: ctx.emit,
    workflowType: 'run_collection_flow',
    title: 'Collection Flow',
  });
  steps = await patchWorkflowSteps({
    runId: workflowRun.id,
    steps,
    stepId: 'execute',
    patch: {
      status: run.status === 'error' ? 'error' : 'done',
      detail: run.status,
    },
    emit: ctx.emit,
    workflowType: 'run_collection_flow',
    title: 'Collection Flow',
  });
  steps = await patchWorkflowSteps({
    runId: workflowRun.id,
    steps,
    stepId: 'report',
    patch: { status: 'done' },
    emit: ctx.emit,
    workflowType: 'run_collection_flow',
    title: 'Collection Flow',
  });

  await updateAssistantWorkflowRun(workflowRun.id, {
    steps,
    status: run.status === 'error' ? 'error' : 'complete',
  });
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'run_collection_flow', outcome: run.status },
  });

  const tone =
    run.status === 'error' ? 'error' : run.awaitingInput ? 'warning' : 'success';
  const alert = createUiBlock(
    'alert',
    {
      message: run.summary || `Flow „${run.flowName}“ — ${run.status}`,
      tone,
    },
    randomUUID()
  );

  const ready =
    run.collectionReady === true
      ? 'Collection ready: ja'
      : run.collectionReady === false
        ? 'Collection ready: nein'
        : null;

  return {
    assistantText: [
      `## Flow „${run.flowName}“`,
      '',
      run.summary || `Status: **${run.status}**`,
      ready ? `\n${ready}` : '',
      run.awaitingInput
        ? '\n\nDer Flow wartet auf Eingabe — bitte im Board fortsetzen.'
        : '',
      `\n\nBoard: ${run.boardPath}`,
      `\nRun-ID: \`${run.historyRunId}\``,
    ].join(''),
    workflowRunId: workflowRun.id,
    metadata: {
      contentType: alert.ok
        ? ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED
        : ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
      collectionFlowRun: run,
      followUpPrompts: [
        {
          id: 'open-flow-board',
          label: 'Flow im Board öffnen',
          prompt: `Öffne ${run.boardPath}`,
        },
      ],
      ...(alert.ok ? { uiLayout: buildUiLayoutFromBlocks([alert.block]) } : {}),
      ...metadataWithWorkflowSteps(steps, 'run_collection_flow'),
    },
  };
};
