'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Button,
  Field,
  Input,
  Spinner,
  Text,
  ToggleGroup,
} from '@msqdx/ui';
import { EventQuickCheckCompanyBriefPanel } from '@/components/event-quick-check/EventQuickCheckCompanyBriefPanel';
import { EventQuickCheckCompetitorsPanel } from '@/components/event-quick-check/EventQuickCheckCompetitorsPanel';
import { EventQuickCheckDeepScanBanner } from '@/components/event-quick-check/EventQuickCheckDeepScanBanner';
import { EventQuickCheckDeepScanPanel } from '@/components/event-quick-check/EventQuickCheckDeepScanPanel';
import { EventQuickCheckGeoQuestionsPanel } from '@/components/event-quick-check/EventQuickCheckGeoQuestionsPanel';
import { EventQuickCheckDashboardView } from '@/components/event-quick-check/EventQuickCheckDashboardView';
import { EventQuickCheckHistoryDialog } from '@/components/event-quick-check/EventQuickCheckHistoryDialog';
import { EventQuickCheckReadinessBanner } from '@/components/event-quick-check/EventQuickCheckReadinessBanner';
import { UiStepList } from '@/components/assistant-ui/organisms/UiStepList';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import { maxGeoQuestionsForProfile } from '@/lib/assistant/event-quick-check/apply-geo-question-edits';
import {
  EVENT_QUICK_CHECK_COMPETITOR_COUNT_MAX,
  EVENT_QUICK_CHECK_PERSONA_COUNT_MAX,
  EVENT_QUICK_CHECK_PERSONA_COUNT_MIN,
  resolveEventQuickCheckProfile,
  type EventQuickCheckDepth,
} from '@/lib/paths/assistant-workflows';
import type { EventQuickCheckHistoryItem } from '@/lib/assistant/event-quick-check/event-quick-check-history';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import {
  API_EVENT_QUICK_CHECK_RUNS,
  EVENT_QUICK_CHECK_RUN_QUERY_PARAM,
  apiEventQuickCheckRun,
  apiEventQuickCheckRunCompanyBrief,
  apiEventQuickCheckRunCompetitors,
  apiEventQuickCheckRunDeepScan,
  apiEventQuickCheckRunGeoQuestions,
  apiEventQuickCheckRunGeoQuestionsReopen,
  apiEventQuickCheckRunShare,
  pathEventQuickCheckRun,
} from '@/lib/paths/event-quick-check-page';
import {
  subscribeAssistantWorkflowStream,
  type WorkflowStep,
} from '@/lib/assistant/workflow-stream-client';

type Phase =
  | 'idle'
  | 'running'
  | 'review'
  | 'competitorsReview'
  | 'geoReview'
  | 'deepScanWaiting'
  | 'done'
  | 'error'
  | 'loading-run';

export function EventQuickCheckPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runFromUrl = searchParams.get(EVENT_QUICK_CHECK_RUN_QUERY_PARAM);

  const [phase, setPhase] = useState<Phase>('idle');
  const [url, setUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [report, setReport] = useState<EventQuickCheckReportModel | null>(null);
  const [platformProjectId, setPlatformProjectId] = useState<string | undefined>();
  const [companyBrief, setCompanyBrief] = useState<EventQuickCheckCompanyBrief | null>(null);
  const [geoQuestions, setGeoQuestions] = useState<string[]>([]);
  const [geoQuestionsByPersona, setGeoQuestionsByPersona] = useState<PersonaGeoQuestionGroup[]>();
  const [geoHasPersona, setGeoHasPersona] = useState(true);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [maxCompetitors, setMaxCompetitors] = useState(
    () => resolveEventQuickCheckProfile('quick').maxCompetitors
  );
  const [personaCount, setPersonaCount] = useState(
    () => resolveEventQuickCheckProfile('quick').personaCount
  );
  const [depth, setDepth] = useState<EventQuickCheckDepth>('quick');

  const applyDepthDefaults = useCallback((nextDepth: EventQuickCheckDepth) => {
    const profile = resolveEventQuickCheckProfile(nextDepth);
    setDepth(nextDepth);
    setPersonaCount(profile.personaCount);
    setMaxCompetitors(profile.maxCompetitors);
  }, []);
  const [deepScanProgress, setDeepScanProgress] = useState<{
    complete: number;
    total: number;
    detail: string;
  }>();
  const [checkionProjectId, setCheckionProjectId] = useState<string | undefined>();
  const [canRerunGeo, setCanRerunGeo] = useState(false);
  const [geoRerunMode, setGeoRerunMode] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [shareLinkBusy, setShareLinkBusy] = useState(false);
  const [shareLinkFeedback, setShareLinkFeedback] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<EventQuickCheckHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const streamRef = useRef<EventSource | null>(null);
  const loadedUrlRunRef = useRef<string | null>(null);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(API_EVENT_QUICK_CHECK_RUNS, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(EQC_PAGE_COPY.historyLoadError);
      const data = (await res.json()) as { items?: EventQuickCheckHistoryItem[] };
      setHistoryItems(data.items ?? []);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : EQC_PAGE_COPY.historyLoadError);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  useEffect(() => () => streamRef.current?.close(), []);

  const openHistory = useCallback(() => {
    void refreshHistory();
    setHistoryOpen(true);
  }, [refreshHistory]);

  const reset = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
    setPhase('idle');
    setError(null);
    setWorkflowRunId(null);
    setSteps([]);
    setReport(null);
    setPlatformProjectId(undefined);
    setCompanyBrief(null);
    setGeoQuestions([]);
    setGeoQuestionsByPersona(undefined);
    setGeoHasPersona(true);
    setCompetitors([]);
    setDeepScanProgress(undefined);
    setCheckionProjectId(undefined);
    setCanRerunGeo(false);
    setGeoRerunMode(false);
    router.replace(pathEventQuickCheckRun(), { scroll: false });
  }, [router]);

  const openRun = useCallback(
    async (runId: string) => {
      setError(null);
      setPhase('loading-run');
      setWorkflowRunId(runId);
      router.replace(pathEventQuickCheckRun(runId), { scroll: false });

      try {
        const res = await fetch(apiEventQuickCheckRun(runId), { credentials: 'same-origin' });
        if (!res.ok) throw new Error(EQC_PAGE_COPY.errorLoadRun);

        const data = (await res.json()) as {
          report?: EventQuickCheckReportModel | null;
          platformProjectId?: string;
          status?: string;
          error?: string;
          awaitingCompanyBrief?: boolean;
          companyBrief?: EventQuickCheckCompanyBrief;
          awaitingGeoQuestions?: boolean;
          geoQuestions?: string[];
          geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
          geoHasPersona?: boolean;
          awaitingCompetitors?: boolean;
          competitors?: string[];
          maxCompetitors?: number;
          personaCount?: number;
          depth?: EventQuickCheckDepth;
          awaitingDeepScan?: boolean;
          deepScanProgress?: { complete: number; total: number; detail: string };
          checkionProjectId?: string;
          canRerunGeo?: boolean;
          steps?: WorkflowStep[];
        };

        if (typeof data.personaCount === 'number') setPersonaCount(data.personaCount);
        if (typeof data.maxCompetitors === 'number') setMaxCompetitors(data.maxCompetitors);
        if (data.depth === 'quick' || data.depth === 'complete') setDepth(data.depth);

        if (data.awaitingCompanyBrief && data.companyBrief) {
          setCompanyBrief(data.companyBrief);
          if (data.steps?.length) setSteps(data.steps);
          setPhase('review');
          return;
        }

        if (data.awaitingCompetitors) {
          setCompetitors(data.competitors ?? ['']);
          setMaxCompetitors(data.maxCompetitors ?? 3);
          if (data.steps?.length) setSteps(data.steps);
          setPhase('competitorsReview');
          return;
        }

        if (data.awaitingGeoQuestions && data.geoQuestions?.length) {
          setGeoQuestions(data.geoQuestions);
          setGeoQuestionsByPersona(data.geoQuestionsByPersona);
          setGeoHasPersona(data.geoHasPersona !== false);
          if (data.report) setReport(data.report);
          setGeoRerunMode(Boolean(data.report));
          if (data.deepScanProgress) setDeepScanProgress(data.deepScanProgress);
          if (data.checkionProjectId) setCheckionProjectId(data.checkionProjectId);
          if (data.steps?.length) setSteps(data.steps);
          setPhase('geoReview');
          return;
        }

        if (data.awaitingDeepScan) {
          setDeepScanProgress(data.deepScanProgress);
          setCheckionProjectId(data.checkionProjectId);
          if (data.steps?.length) setSteps(data.steps);
          setPhase('deepScanWaiting');
          return;
        }

        if (data.report) {
          setReport(data.report);
          setPlatformProjectId(data.platformProjectId);
          setCanRerunGeo(Boolean(data.canRerunGeo));
          setGeoRerunMode(false);
          setPhase('done');
          return;
        }

        if (data.status === 'running' || data.status === 'pending') {
          setPhase('running');
          return;
        }

        throw new Error(data.error ?? EQC_PAGE_COPY.errorLoadRun);
      } catch (e) {
        setPhase('error');
        setError(e instanceof Error ? e.message : EQC_PAGE_COPY.errorLoadRun);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!runFromUrl) {
      loadedUrlRunRef.current = null;
      return;
    }
    if (loadedUrlRunRef.current === runFromUrl) return;
    if (phase === 'running') return;
    loadedUrlRunRef.current = runFromUrl;
    void openRun(runFromUrl);
  }, [runFromUrl, openRun, phase]);

  const confirmCompanyBrief = useCallback(
    async (edits: {
      displayName: string;
      industry: string;
      summary: string;
      targetAudienceHint: string;
      disambiguationNote: string;
    }) => {
      if (!workflowRunId) return;
      setConfirmLoading(true);
      setError(null);
      setPhase('running');

      try {
        streamRef.current?.close();
        streamRef.current = subscribeAssistantWorkflowStream(workflowRunId, {
          onUiBlockUpdate: (block) => {
            const rawSteps = block.props.steps;
            if (Array.isArray(rawSteps)) {
              setSteps(rawSteps as WorkflowStep[]);
            }
          },
          onWorkflow: (payload) => {
            if (payload.steps?.length) setSteps(payload.steps);
          },
        });

        const res = await fetch(apiEventQuickCheckRunCompanyBrief(workflowRunId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edits),
        });

        const result = (await res.json()) as {
          ok: boolean;
          report?: EventQuickCheckReportModel;
          steps?: WorkflowStep[];
          platformProjectId?: string;
          error?: string;
          awaitingGeoQuestions?: boolean;
          geoQuestions?: string[];
          geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
          geoHasPersona?: boolean;
          awaitingCompetitors?: boolean;
          competitors?: string[];
          maxCompetitors?: number;
          deepScanProgress?: { complete: number; total: number; detail: string };
          checkionProjectId?: string;
        };

        streamRef.current?.close();
        streamRef.current = null;

        if (result.steps?.length) setSteps(result.steps);

        if (result.awaitingCompetitors && result.competitors?.length) {
          setCompanyBrief(null);
          setCompetitors(result.competitors);
          setMaxCompetitors(result.maxCompetitors ?? 3);
          setPhase('competitorsReview');
          void refreshHistory();
          return;
        }

        if (result.awaitingGeoQuestions && result.geoQuestions?.length) {
          setCompanyBrief(null);
          setGeoQuestions(result.geoQuestions);
          setGeoQuestionsByPersona(result.geoQuestionsByPersona);
          setGeoHasPersona(result.geoHasPersona !== false);
          setPhase('geoReview');
          void refreshHistory();
          return;
        }

        if (!res.ok || !result.ok || !result.report) {
          throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
        }

        setReport(result.report);
        setPlatformProjectId(result.platformProjectId);
        setCompanyBrief(null);
        setPhase('done');
        void refreshHistory();
      } catch (e) {
        setPhase('error');
        setError(e instanceof Error ? e.message : EQC_PAGE_COPY.errorRunFailed);
      } finally {
        setConfirmLoading(false);
      }
    },
    [workflowRunId, refreshHistory]
  );

  const confirmCompetitors = useCallback(
    async (domains: string[]) => {
      if (!workflowRunId) return;
      setConfirmLoading(true);
      setError(null);
      setPhase('running');

      try {
        streamRef.current?.close();
        streamRef.current = subscribeAssistantWorkflowStream(workflowRunId, {
          onUiBlockUpdate: (block) => {
            const rawSteps = block.props.steps;
            if (Array.isArray(rawSteps)) {
              setSteps(rawSteps as WorkflowStep[]);
            }
          },
          onWorkflow: (payload) => {
            if (payload.steps?.length) setSteps(payload.steps);
          },
        });

        const res = await fetch(apiEventQuickCheckRunCompetitors(workflowRunId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitors: domains }),
        });

        const result = (await res.json()) as {
          ok: boolean;
          report?: EventQuickCheckReportModel;
          steps?: WorkflowStep[];
          platformProjectId?: string;
          error?: string;
          awaitingGeoQuestions?: boolean;
          geoQuestions?: string[];
          geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
          geoHasPersona?: boolean;
          deepScanProgress?: { complete: number; total: number; detail: string };
          checkionProjectId?: string;
        };

        streamRef.current?.close();
        streamRef.current = null;

        if (result.steps?.length) setSteps(result.steps);

        if (result.awaitingGeoQuestions && result.geoQuestions?.length) {
          setCompetitors([]);
          setGeoQuestions(result.geoQuestions);
          setGeoQuestionsByPersona(result.geoQuestionsByPersona);
          setGeoHasPersona(result.geoHasPersona !== false);
          if (result.deepScanProgress) setDeepScanProgress(result.deepScanProgress);
          if (result.checkionProjectId) setCheckionProjectId(result.checkionProjectId);
          setPhase('geoReview');
          void refreshHistory();
          return;
        }

        if (!res.ok || !result.ok || !result.report) {
          throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
        }

        setReport(result.report);
        setPlatformProjectId(result.platformProjectId);
        setCompetitors([]);
        setPhase('done');
        void refreshHistory();
      } catch (e) {
        setPhase('error');
        setError(e instanceof Error ? e.message : EQC_PAGE_COPY.errorRunFailed);
      } finally {
        setConfirmLoading(false);
      }
    },
    [workflowRunId, refreshHistory]
  );

  const confirmGeoQuestions = useCallback(
    async (questions: string[], groups?: PersonaGeoQuestionGroup[]) => {
      if (!workflowRunId) return;
      setConfirmLoading(true);
      setError(null);
      setPhase('running');

      try {
        streamRef.current?.close();
        streamRef.current = subscribeAssistantWorkflowStream(workflowRunId, {
          onUiBlockUpdate: (block) => {
            const rawSteps = block.props.steps;
            if (Array.isArray(rawSteps)) {
              setSteps(rawSteps as WorkflowStep[]);
            }
          },
          onWorkflow: (payload) => {
            if (payload.steps?.length) setSteps(payload.steps);
          },
        });

        const res = await fetch(apiEventQuickCheckRunGeoQuestions(workflowRunId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions, groups }),
        });

        const result = (await res.json()) as {
          ok: boolean;
          report?: EventQuickCheckReportModel;
          steps?: WorkflowStep[];
          platformProjectId?: string;
          error?: string;
          awaitingDeepScan?: boolean;
          deepScanProgress?: { complete: number; total: number; detail: string };
          checkionProjectId?: string;
          canRerunGeo?: boolean;
        };

        streamRef.current?.close();
        streamRef.current = null;

        if (result.steps?.length) setSteps(result.steps);

        if (result.awaitingDeepScan) {
          setGeoQuestions([]);
          setGeoQuestionsByPersona(undefined);
          setDeepScanProgress(result.deepScanProgress);
          setCheckionProjectId(result.checkionProjectId);
          setPhase('deepScanWaiting');
          void refreshHistory();
          return;
        }

        if (!res.ok || !result.ok || !result.report) {
          throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
        }

        setReport(result.report);
        setPlatformProjectId(result.platformProjectId);
        setGeoQuestions([]);
        setGeoQuestionsByPersona(undefined);
        setGeoRerunMode(false);
        setCanRerunGeo(true);
        setPhase('done');
        void refreshHistory();
      } catch (e) {
        setPhase('error');
        setError(e instanceof Error ? e.message : EQC_PAGE_COPY.errorRunFailed);
      } finally {
        setConfirmLoading(false);
      }
    },
    [workflowRunId, refreshHistory]
  );

  const reopenGeoQuestions = useCallback(async () => {
    if (!workflowRunId) return;
    setConfirmLoading(true);
    setError(null);
    try {
      const res = await fetch(apiEventQuickCheckRunGeoQuestionsReopen(workflowRunId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = (await res.json()) as {
        ok?: boolean;
        error?: string;
        geoQuestions?: string[];
        geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
        geoHasPersona?: boolean;
      };
      if (!res.ok || !result.ok || !result.geoQuestions?.length) {
        throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
      }
      setGeoQuestions(result.geoQuestions);
      setGeoQuestionsByPersona(result.geoQuestionsByPersona);
      setGeoHasPersona(result.geoHasPersona !== false);
      setGeoRerunMode(true);
      setPhase('geoReview');
    } catch (e) {
      setError(e instanceof Error ? e.message : EQC_PAGE_COPY.errorRunFailed);
    } finally {
      setConfirmLoading(false);
    }
  }, [workflowRunId]);

  const cancelGeoReopen = useCallback(async () => {
    if (!workflowRunId) return;
    if (report) {
      setConfirmLoading(true);
      try {
        await fetch(apiEventQuickCheckRunGeoQuestionsReopen(workflowRunId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cancel: true }),
        });
        setGeoQuestions([]);
        setGeoQuestionsByPersona(undefined);
        setGeoRerunMode(false);
        setCanRerunGeo(true);
        setPhase('done');
      } catch {
        setPhase('done');
      } finally {
        setConfirmLoading(false);
      }
      return;
    }
    setPhase('done');
  }, [workflowRunId, report]);

  const sharePublicLink = useCallback(async () => {
    if (!workflowRunId) return;
    setShareLinkBusy(true);
    setShareLinkFeedback(null);
    try {
      const res = await fetch(apiEventQuickCheckRunShare(workflowRunId), {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? EQC_PAGE_COPY.shareLinkError);
      }
      const absolute =
        typeof window !== 'undefined'
          ? new URL(data.url, window.location.origin).toString()
          : data.url;
      await navigator.clipboard.writeText(absolute);
      setShareLinkFeedback(EQC_PAGE_COPY.shareLinkCopied);
      window.setTimeout(() => setShareLinkFeedback(null), 2500);
    } catch (e) {
      setShareLinkFeedback(
        e instanceof Error ? e.message : EQC_PAGE_COPY.shareLinkError
      );
      window.setTimeout(() => setShareLinkFeedback(null), 3500);
    } finally {
      setShareLinkBusy(false);
    }
  }, [workflowRunId]);

  const continueAfterDeepScan = useCallback(async () => {
    if (!workflowRunId) return;
    setConfirmLoading(true);
    setError(null);
    setPhase('running');

    try {
      const res = await fetch(apiEventQuickCheckRunDeepScan(workflowRunId), {
        method: 'POST',
        credentials: 'same-origin',
      });
      const result = (await res.json()) as {
        ok: boolean;
        report?: EventQuickCheckReportModel;
        steps?: WorkflowStep[];
        platformProjectId?: string;
        error?: string;
        awaitingDeepScan?: boolean;
        deepScanProgress?: { complete: number; total: number; detail: string };
      };

      if (result.steps?.length) setSteps(result.steps);

      if (result.awaitingDeepScan) {
        setDeepScanProgress(result.deepScanProgress);
        setPhase('deepScanWaiting');
        return;
      }

      if (!res.ok || !result.ok || !result.report) {
        throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
      }

      setReport(result.report);
      setPlatformProjectId(result.platformProjectId);
      setPhase('done');
      void refreshHistory();
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : EQC_PAGE_COPY.errorRunFailed);
    } finally {
      setConfirmLoading(false);
    }
  }, [workflowRunId, refreshHistory]);

  const startAnalysis = useCallback(async () => {
    setError(null);
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError(EQC_PAGE_COPY.errorInvalidUrl);
      return;
    }

    setPhase('running');

    try {
      const createRes = await fetch(API_EVENT_QUICK_CHECK_RUNS, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          projectName: projectName.trim() || undefined,
          depth,
          personaCount,
          maxCompetitors,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? EQC_PAGE_COPY.errorRunFailed);
      }

      const created = (await createRes.json()) as { workflowRunId: string };
      setWorkflowRunId(created.workflowRunId);
      router.replace(pathEventQuickCheckRun(created.workflowRunId), { scroll: false });

      streamRef.current?.close();
      streamRef.current = subscribeAssistantWorkflowStream(created.workflowRunId, {
        onUiBlockUpdate: (block) => {
          const rawSteps = block.props.steps;
          if (Array.isArray(rawSteps)) {
            setSteps(rawSteps as WorkflowStep[]);
          }
        },
        onWorkflow: (payload) => {
          if (payload.steps?.length) setSteps(payload.steps);
        },
      });

      const executeRes = await fetch(apiEventQuickCheckRun(created.workflowRunId), {
        method: 'POST',
        credentials: 'same-origin',
      });

      const result = (await executeRes.json()) as {
        ok: boolean;
        report?: EventQuickCheckReportModel;
        steps?: WorkflowStep[];
        platformProjectId?: string;
        error?: string;
        awaitingCompanyBrief?: boolean;
        companyBrief?: EventQuickCheckCompanyBrief;
        awaitingCompetitors?: boolean;
        competitors?: string[];
        maxCompetitors?: number;
        awaitingGeoQuestions?: boolean;
        geoQuestions?: string[];
        geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
        geoHasPersona?: boolean;
      };

      if (result.steps?.length) setSteps(result.steps);

      if (result.awaitingCompanyBrief && result.companyBrief) {
        streamRef.current?.close();
        streamRef.current = null;
        setCompanyBrief(result.companyBrief);
        setPhase('review');
        void refreshHistory();
        return;
      }

      if (result.awaitingCompetitors && result.competitors?.length) {
        streamRef.current?.close();
        streamRef.current = null;
        setCompetitors(result.competitors);
        setMaxCompetitors(result.maxCompetitors ?? 3);
        setPhase('competitorsReview');
        void refreshHistory();
        return;
      }

      if (result.awaitingGeoQuestions && result.geoQuestions?.length) {
        streamRef.current?.close();
        streamRef.current = null;
        setGeoQuestions(result.geoQuestions);
        setGeoQuestionsByPersona(result.geoQuestionsByPersona);
        setGeoHasPersona(result.geoHasPersona !== false);
        setPhase('geoReview');
        void refreshHistory();
        return;
      }

      streamRef.current?.close();
      streamRef.current = null;

      if (result.steps?.length) setSteps(result.steps);

      if (!executeRes.ok || !result.ok || !result.report) {
        throw new Error(result.error ?? EQC_PAGE_COPY.errorRunFailed);
      }

      setReport(result.report);
      setPlatformProjectId(result.platformProjectId);
      setPhase('done');
      void refreshHistory();
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : EQC_PAGE_COPY.errorRunFailed);
      void refreshHistory();
    }
  }, [url, projectName, depth, personaCount, maxCompetitors, router, refreshHistory]);

  const historyDialog = (
    <EventQuickCheckHistoryDialog
      open={historyOpen}
      onClose={() => setHistoryOpen(false)}
      items={historyItems}
      activeRunId={workflowRunId}
      loading={historyLoading}
      error={historyError}
      onSelect={(item) => void openRun(item.workflowRunId)}
    />
  );

  if (phase === 'done' && report && workflowRunId) {
    return (
      <>
        <div className="plexon-eqc-scroll plexon-eqc-results-scroll" data-plexon-event-quick-check>
          <EventQuickCheckDashboardView
            report={report}
            workflowRunId={workflowRunId}
            platformProjectId={platformProjectId}
            canRerunGeo={canRerunGeo}
            onNewCheck={reset}
            onOpenHistory={openHistory}
            onRerunGeo={() => void reopenGeoQuestions()}
            onShareLink={() => void sharePublicLink()}
            shareLinkBusy={shareLinkBusy}
            shareLinkFeedback={shareLinkFeedback}
          />
        </div>
        {historyDialog}
      </>
    );
  }

  return (
    <>
      <div className="plexon-eqc-scroll plexon-eqc-workspace" data-plexon-event-quick-check>
        <div className="plexon-eqc-narrow">
          <div className="plexon-eqc-header">
            <div className="plexon-eqc-header-copy">
              <Text role="headline" as="h1">
                {EQC_PAGE_COPY.pageTitle}
              </Text>
              <Text role="body">{EQC_PAGE_COPY.pageLead}</Text>
            </div>
            <Button variant="ghost" size="sm" onClick={openHistory}>
              {EQC_PAGE_COPY.historyOpenButton}
            </Button>
          </div>

          <EventQuickCheckReadinessBanner />

          {phase === 'loading-run' ? (
            <div className="plexon-eqc-center">
              <Spinner size="sm" />
              <Text role="body">{EQC_PAGE_COPY.historyOpenRun}</Text>
            </div>
          ) : null}

          {phase === 'idle' || phase === 'error' ? (
            <form
              className="plexon-eqc-stack plexon-eqc-form"
              onSubmit={(e) => {
                e.preventDefault();
                void startAnalysis();
              }}
            >
              <Field label={EQC_PAGE_COPY.urlLabel}>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={EQC_PAGE_COPY.urlPlaceholder}
                  required
                  autoFocus
                  block
                />
              </Field>
              <Field label={EQC_PAGE_COPY.projectNameLabel}>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} block />
              </Field>
              <Field label="Scan-Tiefe">
                <ToggleGroup
                  value={depth}
                  onChange={(value) => applyDepthDefaults(value as EventQuickCheckDepth)}
                  aria-label="Scan-Tiefe"
                  options={[
                    { value: 'quick', label: EQC_PAGE_COPY.depthQuickLabel },
                    { value: 'complete', label: EQC_PAGE_COPY.depthCompleteLabel },
                  ]}
                />
              </Field>
              <Text role="hint" className="plexon-eqc-depth-hint">
                {depth === 'complete' ? EQC_PAGE_COPY.depthCompleteHint : EQC_PAGE_COPY.depthQuickHint}
              </Text>
              <div className="plexon-eqc-split-grid">
                <Field label={EQC_PAGE_COPY.personaCountLabel}>
                  <Input
                    type="number"
                    min={EVENT_QUICK_CHECK_PERSONA_COUNT_MIN}
                    max={EVENT_QUICK_CHECK_PERSONA_COUNT_MAX}
                    value={String(personaCount)}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      if (!Number.isFinite(n)) return;
                      setPersonaCount(
                        Math.max(
                          EVENT_QUICK_CHECK_PERSONA_COUNT_MIN,
                          Math.min(EVENT_QUICK_CHECK_PERSONA_COUNT_MAX, n)
                        )
                      );
                    }}
                    block
                  />
                  <Text role="hint">{EQC_PAGE_COPY.personaCountHint}</Text>
                </Field>
                <Field label={EQC_PAGE_COPY.competitorCountLabel}>
                  <Input
                    type="number"
                    min={0}
                    max={EVENT_QUICK_CHECK_COMPETITOR_COUNT_MAX}
                    value={String(maxCompetitors)}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      if (!Number.isFinite(n)) return;
                      setMaxCompetitors(
                        Math.max(0, Math.min(EVENT_QUICK_CHECK_COMPETITOR_COUNT_MAX, n))
                      );
                    }}
                    block
                  />
                  <Text role="hint">{EQC_PAGE_COPY.competitorCountHint(maxCompetitors)}</Text>
                </Field>
              </div>
              {error ? <Alert tone="error">{error}</Alert> : null}
              <Button type="submit" variant="primary" size="lg">
                {EQC_PAGE_COPY.startButton}
              </Button>
            </form>
          ) : null}

          {phase === 'review' && companyBrief ? (
            <EventQuickCheckCompanyBriefPanel
              brief={companyBrief}
              loading={confirmLoading}
              onConfirm={(edits) => void confirmCompanyBrief(edits)}
            />
          ) : null}

          {phase === 'competitorsReview' ? (
            <EventQuickCheckCompetitorsPanel
              competitors={competitors}
              maxCompetitors={maxCompetitors}
              loading={confirmLoading}
              onConfirm={(domains) => void confirmCompetitors(domains)}
            />
          ) : null}

          {phase === 'geoReview' && geoQuestions.length > 0 ? (
            <div className="plexon-eqc-stack">
              {geoRerunMode ? <Alert tone="info">{EQC_PAGE_COPY.geoRerunHint}</Alert> : null}
              {workflowRunId && (checkionProjectId || deepScanProgress) && !geoRerunMode ? (
                <EventQuickCheckDeepScanBanner
                  workflowRunId={workflowRunId}
                  checkionProjectId={checkionProjectId}
                  initialProgress={deepScanProgress}
                />
              ) : null}
              <EventQuickCheckGeoQuestionsPanel
                questions={geoQuestions}
                groups={geoQuestionsByPersona}
                hasPersona={geoHasPersona || Boolean(geoQuestionsByPersona?.length)}
                maxQuestions={maxGeoQuestionsForProfile(
                  personaCount,
                  resolveEventQuickCheckProfile(depth).geoQuestionsPerPersona
                )}
                loading={confirmLoading}
                confirmLabel={
                  geoRerunMode ? EQC_PAGE_COPY.geoReviewConfirmRerun : undefined
                }
                onConfirm={(questions, groups) => void confirmGeoQuestions(questions, groups)}
                onCancel={geoRerunMode ? () => void cancelGeoReopen() : undefined}
              />
            </div>
          ) : null}

          {phase === 'deepScanWaiting' && workflowRunId ? (
            <EventQuickCheckDeepScanPanel
              workflowRunId={workflowRunId}
              checkionProjectId={checkionProjectId}
              initialProgress={deepScanProgress}
              loading={confirmLoading}
              onContinue={() => void continueAfterDeepScan()}
              onProgress={setDeepScanProgress}
            />
          ) : null}

          {phase === 'running' ? (
            <div className="plexon-eqc-center">
              <Spinner size="md" />
              <Text role="title" as="h2">
                {EQC_PAGE_COPY.runningTitle}
              </Text>
              <Text role="body">{EQC_PAGE_COPY.runningHint}</Text>
              {steps.length > 0 ? (
                <div className="plexon-eqc-stack" style={{ width: '100%' }}>
                  <UiStepList title="Fortschritt" steps={steps} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {historyDialog}
    </>
  );
}
