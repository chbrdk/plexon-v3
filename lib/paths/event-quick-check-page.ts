/** Routes and API paths for the standalone Quick Check page (no chat). */
export const PATH_EVENT_QUICK_CHECK = '/event-quick-check' as const;

/** Query param to open a saved quick check run on `PATH_EVENT_QUICK_CHECK`. */
export const EVENT_QUICK_CHECK_RUN_QUERY_PARAM = 'run' as const;

export const pathEventQuickCheckRun = (workflowRunId?: string | null): string => {
  if (!workflowRunId) return PATH_EVENT_QUICK_CHECK;
  return `${PATH_EVENT_QUICK_CHECK}?${EVENT_QUICK_CHECK_RUN_QUERY_PARAM}=${encodeURIComponent(workflowRunId)}`;
};

export const API_EVENT_QUICK_CHECK_RUNS = '/api/assistant/event-quick-check/runs' as const;

/** Config gate: CHECKION/AUDION env for Quick Check (session). */
export const API_EVENT_QUICK_CHECK_READINESS =
  '/api/assistant/event-quick-check/readiness' as const;

export const apiEventQuickCheckRun = (runId: string): string =>
  `${API_EVENT_QUICK_CHECK_RUNS}/${encodeURIComponent(runId)}`;

export const apiEventQuickCheckRunPdf = (runId: string): string =>
  `${apiEventQuickCheckRun(runId)}/pdf`;

export const apiEventQuickCheckRunPptx = (runId: string): string =>
  `${apiEventQuickCheckRun(runId)}/pptx`;

/** Metadata key on workflow run result JSON. */
export const EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY = 'report' as const;

export const EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY = 'companyBrief' as const;
export const EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY = 'companyBriefConfirmed' as const;
export const EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY = 'awaitingCompanyBrief' as const;

export const EVENT_QUICK_CHECK_CHECKPOINT_KEY = 'checkpoint' as const;
export const EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY = 'awaitingGeoQuestions' as const;
export const EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY = 'geoQuestionsDraft' as const;
export const EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY = 'geoQuestionsByPersonaDraft' as const;
export const EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY = 'geoCompetitorsDraft' as const;
export const EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY = 'geoQuestionsConfirmed' as const;

export const EVENT_QUICK_CHECK_DEPTH_KEY = 'depth' as const;

export const EVENT_QUICK_CHECK_COMPETITORS_DRAFT_KEY = 'competitorsDraft' as const;
export const EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY = 'awaitingCompetitors' as const;
export const EVENT_QUICK_CHECK_COMPETITORS_CONFIRMED_KEY = 'competitorsConfirmed' as const;
export const EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY = 'competitorsCheckpoint' as const;

export const EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY = 'deepScanStarted' as const;
export const EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY = 'awaitingDeepScan' as const;

/** Wave 23 — Collection Flow pause/resume handles on workflow run result. */
export const EVENT_QUICK_CHECK_FLOW_STATE_KEY = 'eqcFlowState' as const;

export const apiEventQuickCheckRunCompetitors = (runId: string): string =>
  `${apiEventQuickCheckRun(runId)}/competitors`;

export const apiEventQuickCheckRunCompanyBrief = (runId: string): string =>
  `${apiEventQuickCheckRun(runId)}/company-brief`;

export const apiEventQuickCheckRunGeoQuestions = (runId: string): string =>
  `${apiEventQuickCheckRun(runId)}/geo-questions`;

export const apiEventQuickCheckRunGeoQuestionsReopen = (runId: string): string =>
  `${apiEventQuickCheckRunGeoQuestions(runId)}/reopen`;

export const apiEventQuickCheckRunDeepScan = (runId: string): string =>
  `${apiEventQuickCheckRun(runId)}/deep-scan`;
