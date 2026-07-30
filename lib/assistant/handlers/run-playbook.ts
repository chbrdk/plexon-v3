import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import '@/lib/assistant/playbooks/index';
import { getPlaybook } from '@/lib/assistant/playbooks/registry';
import { playbookToWorkflowSteps, runPlaybook } from '@/lib/assistant/playbooks/runner';
import type { PlaybookStepKind } from '@/lib/assistant/playbooks/types';
import { runLaunchReadiness } from '@/lib/assistant/playbooks/run-launch-readiness';
import { executeEventQuickCheckRun } from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { buildEventQuickCheckReviewGateLayout } from '@/lib/assistant/ui-blocks/build-event-quick-check-review-gate-ui';
import { runMarketToAudience } from '@/lib/assistant/playbooks/run-market-to-audience';
import { buildPlaybookReportLayout } from '@/lib/assistant/ui-blocks/build-playbook-report-ui';
import {
  buildEventQuickCheckReportLayout,
  isEventQuickCheckLayoutError,
} from '@/lib/assistant/reports/build-event-quick-check-report-block';
import {
  EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY,
  EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY,
  EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY,
} from '@/lib/paths/event-quick-check-page';
import { buildLaunchReadinessLayout } from '@/lib/assistant/ui-blocks/build-launch-readiness-ui';
import { buildMarketToAudienceLayout } from '@/lib/assistant/ui-blocks/build-market-to-audience-ui';
import { EVENT_QUICK_CHECK_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/event-quick-check-steps';
import { EVENT_QUICK_CHECK_PLAYBOOK_ID } from '@/lib/paths/assistant-workflows';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import { LAUNCH_READINESS_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/launch-readiness-steps';
import { MARKET_TO_AUDIENCE_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/market-to-audience-steps';
import { metadataWithWorkflowSteps } from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import { enrichWorkflowLayout } from '@/lib/assistant/insights/enrich-workflow-layout';
import { workflowEnrichmentMetadata } from '@/lib/assistant/insights/enrichment-metadata';
import {
  emitPhase,
  metadataWithStepList,
  type AssistantHandlerResult,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';
import {
  emitWorkflowRunStarted,
  emitWorkflowStepsToStream,
} from '@/lib/assistant/workflows/workflow-step-stream';

function domainFromQuickCheckUrl(url: string): string | undefined {
  try {
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(normalized).hostname;
  } catch {
    return undefined;
  }
}

export const handleRunPlaybookIntent: IntentHandler<'run_playbook'> = async (ctx, intent) => {
  const def = getPlaybook(intent.playbookId);
  if (!def) {
    return {
      assistantText: `## Playbook unbekannt\n\n\`${intent.playbookId}\` ist nicht registriert.`,
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  if (intent.playbookId === 'market_to_audience') {
    emitPhase(ctx.emit, 'workflow', 'market_to_audience');
    const projectName = ctx.resolvedName(intent.projectName) || 'Projekt';
    const workflowRun = await createAssistantWorkflowRun({
      id: randomUUID(),
      conversationId: ctx.conversationId,
      userId: ctx.user.id,
      type: 'market_to_audience',
      steps: [...MARKET_TO_AUDIENCE_INITIAL_STEPS],
    });
    const workflowRunId = workflowRun.id;

    const result = await runMarketToAudience(
      {
        user: ctx.user,
        projectName,
        platformProjectId: ctx.platformProjectId,
        audionProjectId: ctx.bindingIds?.audionProjectId,
        checkionProjectId: ctx.bindingIds?.checkionProjectId,
      },
      { workflowRunId, initialSteps: workflowRun.steps }
    );

    const steps = result.steps;
    const dataLayout = buildMarketToAudienceLayout(result);
    let assistantText: string;
    let metadata: Record<string, unknown> | undefined;

    if (result.ok || result.createdTargetGroups.length > 0) {
      assistantText = `## ${result.playbookLabel}\n\n**${result.projectName}** — ${result.createdTargetGroups.length} Zielgruppe(n) angelegt`;
      if (result.errors.length) {
        assistantText += `\n\n_${result.errors.join(' · ')}_`;
      }
      metadata = metadataWithWorkflowSteps(
        {
          contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
          workflowRunId,
          workflowType: 'market_to_audience',
          uiLayout: dataLayout,
          playbookId: intent.playbookId,
          ...(result.platformProjectId ? { platformProjectId: result.platformProjectId } : {}),
          audionProjectId: result.audionProjectId,
        },
        steps,
        'Markt → Zielgruppen'
      );
    } else {
      assistantText = `## ${result.playbookLabel} fehlgeschlagen\n\n${result.error ?? 'Keine Zielgruppen angelegt'}`;
      metadata = metadataWithStepList(
        {
          contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
          workflowRunId,
          workflowType: 'market_to_audience',
        },
        steps,
        'Markt → Zielgruppen'
      );
    }

    await updateAssistantWorkflowRun(workflowRunId, {
      status: result.ok ? 'completed' : 'failed',
      steps,
      result: {
        createdTargetGroups: result.createdTargetGroups.length,
        echonThreadId: result.marketSummary?.threadId,
      },
    });
    await recordAssistantUsageEvent({
      userId: ctx.user.id,
      eventType: 'workflow_run',
      rawUnits: {
        workflow: 'market_to_audience',
        playbook: intent.playbookId,
        targetGroupsCreated: result.createdTargetGroups.length,
      },
    });
    return { assistantText, metadata, workflowRunId };
  }

  if (intent.playbookId === EVENT_QUICK_CHECK_PLAYBOOK_ID) {
    emitPhase(ctx.emit, 'workflow', 'event_quick_check');
    const quickName = ctx.resolvedName(intent.projectName) || domainFromQuickCheckUrl(intent.url) || 'Quick Check';
    const workflowRun = await createAssistantWorkflowRun({
      id: randomUUID(),
      conversationId: ctx.conversationId,
      userId: ctx.user.id,
      type: 'event_quick_check',
      steps: [...EVENT_QUICK_CHECK_INITIAL_STEPS],
    });
    const workflowRunId = workflowRun.id;

    emitWorkflowRunStarted(ctx.emit, workflowRunId, 'event_quick_check');
    emitWorkflowStepsToStream(ctx.emit, workflowRun.steps, 'event_quick_check', QUICK_CHECK_LABEL);

    await updateAssistantWorkflowRun(workflowRunId, {
      status: 'running',
      result: {
        url: intent.url,
        projectName: quickName,
        ...(ctx.platformProjectId ? { platformProjectId: ctx.platformProjectId } : {}),
      },
    });

    const executed = await executeEventQuickCheckRun({
      user: ctx.user,
      workflowRunId,
      emit: ctx.emit,
    });

    const steps = executed.steps;
    let assistantText: string;
    let metadata: Record<string, unknown> | undefined;
    let conversationPatch: AssistantHandlerResult['conversationPatch'];
    let workflowResult: Record<string, unknown> = {
      url: intent.url,
      projectName: quickName,
      platformProjectId: ctx.platformProjectId,
    };

    if (executed.awaitingCompanyBrief && executed.companyBrief) {
      assistantText = `## ${QUICK_CHECK_LABEL}\n\n**${quickName}** · ${intent.url}\n\nBitte das **Unternehmensprofil** prüfen oder anpassen — danach starten Scan, Persona und GEO.`;
      const gateLayout = buildEventQuickCheckReviewGateLayout(workflowRunId);
      metadata = metadataWithWorkflowSteps(
        {
          contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
          workflowRunId,
          workflowType: 'event_quick_check',
          uiLayout: gateLayout,
          playbookId: intent.playbookId,
          awaitingCompanyBrief: true,
        },
        steps,
        QUICK_CHECK_LABEL
      );
      workflowResult = {
        ...workflowResult,
        [EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY]: executed.companyBrief,
        [EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]: true,
      };
      await updateAssistantWorkflowRun(workflowRunId, {
        status: 'running',
        steps,
        result: workflowResult,
      });
      return { assistantText, metadata, workflowRunId, conversationPatch };
    }

    if (executed.awaitingCompetitors) {
      assistantText = `## ${QUICK_CHECK_LABEL}\n\n**${quickName}** · ${intent.url}\n\nBitte die **Wettbewerber** prüfen — sie werden wie im CHECKION-Projekt gespeichert und per Deep Scan gecrawlt.`;
      const gateLayout = buildEventQuickCheckReviewGateLayout(workflowRunId);
      metadata = metadataWithWorkflowSteps(
        {
          contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
          workflowRunId,
          workflowType: 'event_quick_check',
          uiLayout: gateLayout,
          playbookId: intent.playbookId,
          awaitingCompetitors: true,
        },
        steps,
        QUICK_CHECK_LABEL
      );
      await updateAssistantWorkflowRun(workflowRunId, {
        status: 'running',
        steps,
      });
      return { assistantText, metadata, workflowRunId, conversationPatch };
    }

    if (executed.awaitingGeoQuestions && executed.geoQuestions?.length) {
      assistantText = `## ${QUICK_CHECK_LABEL}\n\n**${quickName}** · ${intent.url}\n\nBitte die **GEO-Fragen** prüfen — sie werden an mehrere LLMs gesendet, bevor der Wettbewerbs-Check startet.`;
      const gateLayout = buildEventQuickCheckReviewGateLayout(workflowRunId);
      metadata = metadataWithWorkflowSteps(
        {
          contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
          workflowRunId,
          workflowType: 'event_quick_check',
          uiLayout: gateLayout,
          playbookId: intent.playbookId,
          awaitingGeoQuestions: true,
        },
        steps,
        QUICK_CHECK_LABEL
      );
      await updateAssistantWorkflowRun(workflowRunId, {
        status: 'running',
        steps,
      });
      return { assistantText, metadata, workflowRunId, conversationPatch };
    }

    if (!executed.ok && !executed.report) {
      assistantText = `## ${QUICK_CHECK_LABEL} fehlgeschlagen\n\n${executed.error ?? 'Keine Schritte erfolgreich'}`;
      metadata = metadataWithStepList(
        { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'event_quick_check' },
        steps,
        QUICK_CHECK_LABEL
      );
      workflowResult = { ...workflowResult, error: executed.error ?? 'Keine Schritte erfolgreich' };
      await updateAssistantWorkflowRun(workflowRunId, {
        status: 'failed',
        steps,
        result: workflowResult,
      });
      return { assistantText, metadata, workflowRunId, conversationPatch };
    }

    const report = executed.report!;
    workflowResult = {
      ...workflowResult,
      platformProjectId: executed.platformProjectId,
      [EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]: report,
    };

    const layoutBuilt = buildEventQuickCheckReportLayout(report);
    const dataLayout = isEventQuickCheckLayoutError(layoutBuilt)
      ? { version: 1 as const, blocks: [] }
      : layoutBuilt;

    assistantText = `## ${QUICK_CHECK_LABEL}\n\n**${report.meta.projectName}** · ${report.meta.url} — Analyse abgeschlossen`;
    if (executed.error) {
      assistantText += `\n\n_${executed.error}_`;
    }

    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'event_quick_check',
        uiLayout: dataLayout,
        playbookId: intent.playbookId,
        ...(executed.platformProjectId ? { platformProjectId: executed.platformProjectId } : {}),
      },
      steps,
      QUICK_CHECK_LABEL
    );
    if (
      executed.platformProjectId &&
      ctx.conversation.platformProjectId !== executed.platformProjectId
    ) {
      conversationPatch = { platformProjectId: executed.platformProjectId };
    }

    await updateAssistantWorkflowRun(workflowRunId, {
      status: executed.ok ? 'completed' : 'failed',
      steps,
      result: workflowResult,
    });
    await recordAssistantUsageEvent({
      userId: ctx.user.id,
      eventType: 'workflow_run',
      rawUnits: {
        workflow: 'event_quick_check',
        playbook: intent.playbookId,
        stepsCompleted: steps.filter((s) => s.status === 'done').length,
      },
    });
    return { assistantText, metadata, workflowRunId, conversationPatch };
  }

  if (intent.playbookId === 'launch_readiness') {
    emitPhase(ctx.emit, 'workflow', 'launch_readiness');
    const launchName = ctx.resolvedName(intent.projectName) || 'Neues Projekt';
    const workflowRun = await createAssistantWorkflowRun({
      id: randomUUID(),
      conversationId: ctx.conversationId,
      userId: ctx.user.id,
      type: 'launch_readiness',
      steps: [...LAUNCH_READINESS_INITIAL_STEPS],
    });
    const workflowRunId = workflowRun.id;

    const launch = await runLaunchReadiness(
      {
        user: ctx.user,
        projectName: launchName,
        url: intent.url,
        platformProjectId: ctx.platformProjectId,
      },
      { workflowRunId, initialSteps: workflowRun.steps }
    );

    const steps = launch.steps;
    let assistantText: string;
    let metadata: Record<string, unknown> | undefined;
    let conversationPatch: AssistantHandlerResult['conversationPatch'];

    if (launch.ok || launch.outcomes.some((o) => o.status === 'done')) {
      const dataLayout = buildLaunchReadinessLayout(launch);
      const enriched = await enrichWorkflowLayout(
        ctx,
        {
          workflowType: 'launch_readiness',
          url: launch.url,
          launch,
        },
        dataLayout
      );
      assistantText = `## ${launch.playbookLabel}\n\n**${launch.projectName}** · ${launch.url} — ${launch.outcomes.filter((o) => o.status === 'done').length}/${launch.outcomes.length} Schritte erfolgreich`;
      if (launch.error) {
        assistantText += `\n\n_${launch.error}_`;
      }
      if (enriched.assistantInsightMarkdown) {
        assistantText += `\n\n${enriched.assistantInsightMarkdown}`;
      }
      metadata = metadataWithWorkflowSteps(
        {
          contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
          workflowRunId,
          workflowType: 'launch_readiness',
          uiLayout: enriched.layout,
          playbookId: intent.playbookId,
          ...workflowEnrichmentMetadata(enriched),
          ...(launch.platformProjectId ? { platformProjectId: launch.platformProjectId } : {}),
        },
        steps,
        'Launch Readiness'
      );
      if (launch.platformProjectId && ctx.conversation.platformProjectId !== launch.platformProjectId) {
        conversationPatch = { platformProjectId: launch.platformProjectId };
      }
    } else {
      assistantText = `## ${launch.playbookLabel} fehlgeschlagen\n\n${launch.error ?? 'Keine Schritte erfolgreich'}`;
      metadata = metadataWithStepList(
        { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'launch_readiness' },
        steps,
        'Launch Readiness'
      );
    }
    await updateAssistantWorkflowRun(workflowRunId, {
      status: launch.ok ? 'completed' : 'failed',
      steps,
      result: {
        platformProjectId: launch.platformProjectId,
        outcomes: launch.outcomes.length,
      },
    });
    await recordAssistantUsageEvent({
      userId: ctx.user.id,
      eventType: 'workflow_run',
      rawUnits: {
        workflow: 'launch_readiness',
        playbook: intent.playbookId,
        stepsCompleted: launch.outcomes.filter((o) => o.status === 'done').length,
      },
    });
    return { assistantText, metadata, workflowRunId, conversationPatch };
  }

  emitPhase(ctx.emit, 'workflow', 'website_audit');
  const skipKinds: PlaybookStepKind[] = [];
  if (intent.skipGeo) skipKinds.push('geo_analysis');
  if (!intent.contrast) skipKinds.push('contrast_check');

  const initialSteps = playbookToWorkflowSteps(def.steps, { skipKinds });
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'website_audit',
    steps: initialSteps,
  });
  const workflowRunId = workflowRun.id;

  const audit = await runPlaybook(
    {
      playbookId: intent.playbookId,
      url: intent.url,
      context: {
        url: intent.url,
        userId: ctx.user.id,
        platformProjectId: ctx.platformProjectId ?? undefined,
        checkionProjectId: ctx.bindingIds?.checkionProjectId,
        contrast: intent.contrast,
        includeGeo: !intent.skipGeo,
      },
      skipKinds,
    },
    { workflowRunId, initialSteps: workflowRun.steps }
  );

  const steps = audit.steps;
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (audit.ok || audit.outcomes.some((o) => o.status === 'done')) {
    const dataLayout = buildPlaybookReportLayout(audit);
    const enriched = await enrichWorkflowLayout(
      ctx,
      {
        workflowType: 'website_audit',
        url: intent.url,
        playbook: audit,
      },
      dataLayout
    );
    assistantText = `## ${audit.playbookLabel}\n\n**${intent.url}** — ${audit.outcomes.filter((o) => o.status === 'done').length}/${audit.outcomes.length} Schritte erfolgreich`;
    if (audit.requiredFailed) {
      assistantText += '\n\n_Pflicht-Schritt fehlgeschlagen — Report basiert auf Teilergebnissen._';
    }
    if (enriched.assistantInsightMarkdown) {
      assistantText += `\n\n${enriched.assistantInsightMarkdown}`;
    }
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'website_audit',
        uiLayout: enriched.layout,
        playbookId: intent.playbookId,
        ...workflowEnrichmentMetadata(enriched),
      },
      steps,
      'Website-Audit'
    );
  } else {
    assistantText = `## ${audit.playbookLabel} fehlgeschlagen\n\n${audit.error ?? 'Keine Schritte erfolgreich'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'website_audit' },
      steps,
      'Website-Audit'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, {
    status: audit.ok ? 'completed' : 'failed',
    steps,
  });
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: {
      workflow: 'website_audit',
      playbook: intent.playbookId,
      stepsCompleted: audit.outcomes.filter((o) => o.status === 'done').length,
    },
  });
  return { assistantText, metadata, workflowRunId };
};
