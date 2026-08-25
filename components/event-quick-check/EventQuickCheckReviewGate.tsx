'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Spinner } from '@msqdx/ui';
import { EventQuickCheckCompetitorsPanel } from '@/components/event-quick-check/EventQuickCheckCompetitorsPanel';
import { EventQuickCheckCompanyBriefPanel } from '@/components/event-quick-check/EventQuickCheckCompanyBriefPanel';
import { EventQuickCheckGeoQuestionsPanel } from '@/components/event-quick-check/EventQuickCheckGeoQuestionsPanel';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import type { GeoMeasurement } from '@/lib/geo/measurement';
import { maxGeoQuestionsForProfile } from '@/lib/assistant/event-quick-check/apply-geo-question-edits';
import { resolveEventQuickCheckProfile } from '@/lib/paths/assistant-workflows';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import {
  apiEventQuickCheckRun,
  apiEventQuickCheckRunCompanyBrief,
  apiEventQuickCheckRunCompetitors,
  apiEventQuickCheckRunGeoQuestions,
} from '@/lib/paths/event-quick-check-page';
import { subscribeAssistantWorkflowStream } from '@/lib/assistant/workflow-stream-client';
import { pollEventQuickCheckRunUntilSettled } from '@/components/event-quick-check/poll-event-quick-check-run';
import { eqcClientErrorMessage } from '@/components/event-quick-check/eqc-client-error';
import { readEqcJsonResponse } from '@/components/event-quick-check/read-eqc-json-response';

export type EventQuickCheckReviewGateProps = {
  workflowRunId: string;
  onComplete?: () => void;
  onPhaseChange?: () => void;
};

type RunSnapshot = {
  awaitingCompanyBrief?: boolean;
  companyBrief?: EventQuickCheckCompanyBrief;
  awaitingCompetitors?: boolean;
  competitors?: string[];
  maxCompetitors?: number;
  awaitingGeoQuestions?: boolean;
  geoQuestions?: string[];
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  geoHasPersona?: boolean;
  status?: string;
  error?: string;
};

export function EventQuickCheckReviewGate({
  workflowRunId,
  onComplete,
  onPhaseChange,
}: EventQuickCheckReviewGateProps) {
  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RunSnapshot>({});
  const streamRef = useRef<ReturnType<typeof subscribeAssistantWorkflowStream> | null>(null);

  const loadRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiEventQuickCheckRun(workflowRunId), { credentials: 'same-origin' });
      if (!res.ok) throw new Error(EQC_PAGE_COPY.errorLoadRun);
      const data = (await res.json()) as RunSnapshot;
      setSnapshot(data);
      if (data.status === 'completed') {
        onComplete?.();
      }
    } catch (e) {
      setError(eqcClientErrorMessage(e, EQC_PAGE_COPY.errorLoadRun));
    } finally {
      setLoading(false);
    }
  }, [workflowRunId, onComplete]);

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  const watchStream = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = subscribeAssistantWorkflowStream(workflowRunId, {});
  }, [workflowRunId]);

  const confirmCompanyBrief = useCallback(
    async (edits: {
      displayName: string;
      industry: string;
      summary: string;
      targetAudienceHint: string;
      disambiguationNote: string;
    }) => {
      setConfirmLoading(true);
      setError(null);
      watchStream();
      try {
        const res = await fetch(apiEventQuickCheckRunCompanyBrief(workflowRunId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edits),
        });
        const result =
          res.status === 202
            ? await pollEventQuickCheckRunUntilSettled(workflowRunId)
            : await readEqcJsonResponse<
                RunSnapshot & {
                  ok?: boolean;
                  error?: string;
                  report?: unknown;
                }
              >(res);
        streamRef.current?.close();
        streamRef.current = null;

        if ((!res.ok && res.status !== 202) || result.error) {
          throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
        }

        if (result.awaitingCompetitors) {
          setSnapshot({
            awaitingCompetitors: true,
            competitors: result.competitors?.length ? result.competitors : [''],
            maxCompetitors: result.maxCompetitors,
            status: 'running',
          });
          onPhaseChange?.();
          return;
        }

        if (result.awaitingGeoQuestions && result.geoQuestions?.length) {
          setSnapshot({
            awaitingGeoQuestions: true,
            geoQuestions: result.geoQuestions,
            geoQuestionsByPersona: result.geoQuestionsByPersona,
            status: 'running',
          });
          onPhaseChange?.();
          return;
        }

        if (result.awaitingDeepScan || result.report || result.status === 'completed') {
          onComplete?.();
          return;
        }

        if (!result.ok) {
          throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
        }

        await loadRun();
        onPhaseChange?.();
      } catch (e) {
        setError(eqcClientErrorMessage(e, EQC_PAGE_COPY.errorRunFailed));
      } finally {
        setConfirmLoading(false);
      }
    },
    [workflowRunId, watchStream, loadRun, onComplete, onPhaseChange]
  );

  const confirmCompetitors = useCallback(
    async (competitors: string[]) => {
      setConfirmLoading(true);
      setError(null);
      watchStream();
      try {
        const res = await fetch(apiEventQuickCheckRunCompetitors(workflowRunId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitors }),
        });
        const result =
          res.status === 202
            ? await pollEventQuickCheckRunUntilSettled(workflowRunId)
            : await readEqcJsonResponse<
                RunSnapshot & {
                  ok?: boolean;
                  error?: string;
                  report?: unknown;
                  awaitingGeoQuestions?: boolean;
                  geoQuestions?: string[];
                  awaitingDeepScan?: boolean;
                }
              >(res);
        streamRef.current?.close();
        streamRef.current = null;

        if ((!res.ok && res.status !== 202) || result.error) {
          throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
        }

        if (result.awaitingGeoQuestions && result.geoQuestions?.length) {
          setSnapshot({
            awaitingGeoQuestions: true,
            geoQuestions: result.geoQuestions,
            geoQuestionsByPersona: result.geoQuestionsByPersona,
            status: 'running',
          });
          onPhaseChange?.();
          return;
        }

        if (result.awaitingDeepScan || result.report || result.status === 'completed') {
          onComplete?.();
          return;
        }

        if (!result.ok) {
          throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
        }

        await loadRun();
        onPhaseChange?.();
      } catch (e) {
        setError(eqcClientErrorMessage(e, EQC_PAGE_COPY.errorRunFailed));
      } finally {
        setConfirmLoading(false);
      }
    },
    [workflowRunId, watchStream, loadRun, onComplete, onPhaseChange]
  );

  const confirmGeoQuestions = useCallback(
    async (
      questions: string[],
      groups?: PersonaGeoQuestionGroup[],
      measurements?: GeoMeasurement[]
    ) => {
      setConfirmLoading(true);
      setError(null);
      watchStream();
      try {
        const res = await fetch(apiEventQuickCheckRunGeoQuestions(workflowRunId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions, groups, measurements }),
        });
        if (res.status === 202) {
          const polled = await pollEventQuickCheckRunUntilSettled(workflowRunId);
          if (!polled.ok || polled.error) {
            throw new Error(polled.error ?? EQC_PAGE_COPY.errorRunFailed);
          }
        } else {
          const result = await readEqcJsonResponse<{ ok?: boolean; error?: string; report?: unknown }>(
            res
          );
          if (!res.ok || result.error) {
            throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
          }
        }

        streamRef.current?.close();
        streamRef.current = null;

        onComplete?.();
      } catch (e) {
        setError(eqcClientErrorMessage(e, EQC_PAGE_COPY.errorRunFailed));
      } finally {
        setConfirmLoading(false);
      }
    },
    [workflowRunId, watchStream, onComplete]
  );

  useEffect(
    () => () => {
      streamRef.current?.close();
    },
    []
  );

  if (loading) {
    return (
      <div className="plexon-eqc-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (snapshot.awaitingCompanyBrief && snapshot.companyBrief) {
    return (
      <UiBlockSurface title={EQC_PAGE_COPY.reviewTitle} icon="business" brandColor="theme">
        <EventQuickCheckCompanyBriefPanel
          brief={snapshot.companyBrief}
          loading={confirmLoading}
          onConfirm={confirmCompanyBrief}
        />
      </UiBlockSurface>
    );
  }

  if (snapshot.awaitingCompetitors) {
    return (
      <UiBlockSurface title={EQC_PAGE_COPY.competitorsReviewTitle} icon="groups" brandColor="orange">
        <EventQuickCheckCompetitorsPanel
          competitors={snapshot.competitors ?? ['']}
          maxCompetitors={snapshot.maxCompetitors ?? 3}
          loading={confirmLoading}
          onConfirm={confirmCompetitors}
        />
      </UiBlockSurface>
    );
  }

  if (snapshot.awaitingGeoQuestions && snapshot.geoQuestions?.length) {
    return (
      <UiBlockSurface title={EQC_PAGE_COPY.geoReviewTitle} icon="travel_explore" brandColor="green">
        <EventQuickCheckGeoQuestionsPanel
          questions={snapshot.geoQuestions}
          groups={snapshot.geoQuestionsByPersona}
          hasPersona={snapshot.geoHasPersona !== false || Boolean(snapshot.geoQuestionsByPersona?.length)}
          maxQuestions={maxGeoQuestionsForProfile(
            resolveEventQuickCheckProfile(snapshot.geoQuestionsByPersona?.length ? 'complete' : 'quick')
              .personaCount,
            resolveEventQuickCheckProfile(snapshot.geoQuestionsByPersona?.length ? 'complete' : 'quick')
              .geoQuestionsPerPersona
          )}
          loading={confirmLoading}
          onConfirm={confirmGeoQuestions}
        />
      </UiBlockSurface>
    );
  }

  return null;
}
