/**
 * AUDION Study/Wave journey segment via platform BFF (not FastAPI).
 * Spec: collection-test-flow.md Wave 2
 */

import { getAudionServiceToken } from '@/lib/constants';
import { pollUntil } from '@/lib/assistant/poll-until';
import type { CollectionVerdict, EmbeddedAudionJourneyFlow } from '@/lib/collection-test-flow';
import {
  audionPlatformFlowsHybridSegment,
  audionPlatformJourneyJob,
  audionPlatformJourneyJobGateBranch,
  audionPlatformStudiesFromFlow,
  audionPlatformStudyWave,
  audionPlatformStudyWaveEvaluate,
  audionPlatformStudyWaveStart,
  audionPlatformStudyWaveSync,
} from '@/lib/paths/audion-api';
import {
  buildCollectionReportMarkdown,
  buildCollectionSoftQNotes,
  mergeEvaluationNotes,
} from '@/lib/collection-flow-rollup';

export type AudionJourneyStep = {
  step?: number;
  action?: string;
  target?: string;
  result?: string;
  reasoning?: string | null;
  timestamp?: string | null;
  screenshot?: string | null;
  screenshotUrl?: string | null;
};

export type AudionJourneyJobSnapshot = {
  jobId: string;
  status: string;
  finalUrl: string | null;
  success: boolean | null;
  taskCompleted: boolean;
  validEvidence: boolean;
  error?: string | null;
  gateSignals?: Record<string, unknown> | null;
  /** Raw agent steps (Wave 6) — used by the board to paint node states / outputs / inspector. */
  steps?: AudionJourneyStep[];
  flowCursor?: Record<string, unknown> | null;
};

export type AudionJourneySegmentResult =
  | {
      ok: true;
      studyId: string;
      waveId: string;
      jobId: string;
      job: AudionJourneyJobSnapshot;
    }
  | {
      ok: false;
      error: string;
      studyId?: string;
      waveId?: string;
      jobId?: string;
      job?: AudionJourneyJobSnapshot;
    };

function requireAuthHeaders():
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: string } {
  const token = getAudionServiceToken();
  if (!token) {
    return { ok: false, error: 'AUDION_API_TOKEN not configured' };
  }
  return {
    ok: true,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

function pickFinalUrl(job: Record<string, unknown>): string | null {
  const gate = (job.gateSignals ?? null) as Record<string, unknown> | null;
  const result = (job.result ?? null) as Record<string, unknown> | null;
  const resultGate = (result?.gateSignals ?? null) as Record<string, unknown> | null;
  const candidates = [
    gate?.finalUrl,
    resultGate?.finalUrl,
    result?.finalUrl,
    job.finalUrl,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

function mapJourneySteps(result: Record<string, unknown> | null): AudionJourneyStep[] {
  const raw = result?.steps;
  if (!Array.isArray(raw)) return [];
  const steps: AudionJourneyStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    steps.push({
      step: typeof o.step === 'number' ? o.step : undefined,
      action: typeof o.action === 'string' ? o.action : undefined,
      target: typeof o.target === 'string' ? o.target : undefined,
      result: typeof o.result === 'string' ? o.result : undefined,
      reasoning: typeof o.reasoning === 'string' ? o.reasoning : null,
      timestamp: typeof o.timestamp === 'string' ? o.timestamp : null,
      screenshot: typeof o.screenshot === 'string' ? o.screenshot : null,
      screenshotUrl: typeof o.screenshotUrl === 'string' ? o.screenshotUrl : null,
    });
  }
  return steps;
}

function mapJobSnapshot(jobId: string, body: Record<string, unknown>): AudionJourneyJobSnapshot {
  const status = typeof body.status === 'string' ? body.status : 'running';
  const result = (body.result ?? null) as Record<string, unknown> | null;
  const success =
    typeof result?.success === 'boolean'
      ? result.success
      : typeof body.success === 'boolean'
        ? body.success
        : null;
  const gate = (body.gateSignals ?? result?.gateSignals ?? null) as Record<string, unknown> | null;
  const goalReached = gate?.goalReached === true;
  const taskCompleted = success === true || goalReached;
  // Minimal evidence: completed without error and at least one URL signal or success
  const finalUrl = pickFinalUrl(body);
  const error =
    typeof body.error === 'string'
      ? body.error
      : typeof result?.error === 'string'
        ? result.error
        : null;
  const validEvidence =
    status === 'complete' && !error && (taskCompleted || Boolean(finalUrl));
  const flowCursor =
    body.flowCursor && typeof body.flowCursor === 'object'
      ? (body.flowCursor as Record<string, unknown>)
      : null;

  return {
    jobId,
    status,
    finalUrl,
    success,
    taskCompleted,
    validEvidence,
    error,
    gateSignals: gate,
    steps: mapJourneySteps(result),
    flowCursor,
  };
}

export async function createStudyFromFlow(input: {
  projectId: string;
  flow: EmbeddedAudionJourneyFlow;
  name?: string;
}): Promise<
  | { ok: true; studyId: string; waveId: string; flowId: string }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return auth;

  try {
    const res = await fetch(audionPlatformStudiesFromFlow(), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({
        projectId: input.projectId,
        name: input.name ?? input.flow.name,
        flow: input.flow,
        flowId: input.flow.id,
      }),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `AUDION from-flow: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    const json = JSON.parse(text) as {
      study?: { id?: string };
      wave?: { id?: string };
      flowId?: string;
    };
    const studyId = json.study?.id;
    const waveId = json.wave?.id;
    if (!studyId || !waveId) {
      return { ok: false, error: 'AUDION from-flow: Antwort ohne study/wave id' };
    }
    return { ok: true, studyId, waveId, flowId: json.flowId ?? input.flow.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function startStudyWave(input: {
  studyId: string;
  waveId: string;
}): Promise<
  | { ok: true; jobId: string }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return auth;

  try {
    const res = await fetch(audionPlatformStudyWaveStart(input.studyId, input.waveId), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({ force: false }),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `AUDION wave start: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    const json = JSON.parse(text) as {
      started?: Array<{ jobId?: string | null; skipped?: boolean }>;
    };
    const jobId = json.started?.find((s) => s.jobId)?.jobId;
    if (!jobId) {
      return { ok: false, error: 'AUDION wave start: kein jobId' };
    }
    return { ok: true, jobId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchJourneyJob(
  jobId: string
): Promise<{ ok: true; job: AudionJourneyJobSnapshot } | { ok: false; error: string }> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return auth;

  try {
    const res = await fetch(audionPlatformJourneyJob(jobId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `AUDION journey job: HTTP ${res.status}` };
    }
    const json = JSON.parse(text) as Record<string, unknown>;
    return { ok: true, job: mapJobSnapshot(jobId, json) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pollJourneyJob(
  jobId: string,
  options?: { intervalMs?: number; maxMs?: number }
): Promise<
  | { ok: true; job: AudionJourneyJobSnapshot }
  | { ok: false; error: string; lastStatus?: string }
> {
  const TERMINAL = new Set(['complete', 'error']);
  return pollUntil({
    intervalMs: options?.intervalMs ?? 3000,
    maxMs: options?.maxMs ?? 8 * 60 * 1000,
    fetch: async () => {
      const res = await fetchJourneyJob(jobId);
      if (!res.ok) {
        return { done: true, error: res.error, status: 'error' };
      }
      const status = res.job.status.toLowerCase();
      if (TERMINAL.has(status)) {
        return { done: true, value: res.job, status };
      }
      return { done: false, status, progress: status === 'running' ? 50 : 10 };
    },
  });
}

export async function syncStudyWave(input: {
  studyId: string;
  waveId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(audionPlatformStudyWaveSync(input.studyId, input.waveId), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: `AUDION wave sync: HTTP ${res.status} – ${text.slice(0, 120)}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Live-Gate: tell the agent which when/otherwise branch to take. */
export async function postJourneyGateBranch(input: {
  jobId: string;
  gateNodeId: string;
  edgeKind: 'when' | 'otherwise';
}): Promise<
  | { ok: true; flowCursor?: Record<string, unknown> | null }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(audionPlatformJourneyJobGateBranch(input.jobId), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({
        gateNodeId: input.gateNodeId,
        edgeKind: input.edgeKind,
      }),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `AUDION gate-branch: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    const json = text ? (JSON.parse(text) as { flowCursor?: Record<string, unknown> }) : {};
    return { ok: true, flowCursor: json.flowCursor ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Hybrid Agent-Segment for a single journey node (Wave 6). */
export async function postHybridSegment(input: {
  projectId: string;
  nodeId: string;
  flow: EmbeddedAudionJourneyFlow;
}): Promise<{ ok: true; jobId?: string } | { ok: false; error: string }> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(audionPlatformFlowsHybridSegment(), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({
        projectId: input.projectId,
        nodeId: input.nodeId,
        flow: input.flow,
      }),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `AUDION hybrid-segment: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    const json = text
      ? (JSON.parse(text) as { jobId?: string; started?: { jobId?: string } })
      : {};
    return { ok: true, jobId: json.jobId ?? json.started?.jobId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type AudionWaveSnapshot = {
  id: string;
  waveKey: string;
  reportMarkdown: string | null;
  evaluation: {
    notes?: string[] | null;
    softScores?: Record<string, unknown> | null;
    aggregate?: Record<string, unknown> | null;
  } | null;
};

export async function evaluateStudyWave(input: {
  studyId: string;
  waveId: string;
}): Promise<{ ok: true; wave: AudionWaveSnapshot } | { ok: false; error: string }> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(audionPlatformStudyWaveEvaluate(input.studyId, input.waveId), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `AUDION wave evaluate: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    return { ok: true, wave: mapWaveSnapshot(JSON.parse(text) as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchStudyWave(input: {
  studyId: string;
  waveId: string;
}): Promise<{ ok: true; wave: AudionWaveSnapshot } | { ok: false; error: string }> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return auth;
  try {
    const res = await fetch(audionPlatformStudyWave(input.studyId, input.waveId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `AUDION wave GET: HTTP ${res.status} – ${text.slice(0, 120)}`,
      };
    }
    return { ok: true, wave: mapWaveSnapshot(JSON.parse(text) as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function mapWaveSnapshot(body: Record<string, unknown>): AudionWaveSnapshot {
  const evaluation =
    body.evaluation && typeof body.evaluation === 'object'
      ? (body.evaluation as AudionWaveSnapshot['evaluation'])
      : null;
  return {
    id: typeof body.id === 'string' ? body.id : '',
    waveKey: typeof body.waveKey === 'string' ? body.waveKey : 'default',
    reportMarkdown: typeof body.reportMarkdown === 'string' ? body.reportMarkdown : null,
    evaluation,
  };
}

/**
 * Evaluate wave (Soft-Q draft) then PATCH Collection verdict into notes + reportMarkdown.
 * Does not invent Soft-Q scores from Checkion.
 */
export async function rollupCollectionVerdictToAudionWave(input: {
  studyId: string;
  waveId: string;
  platformProjectId: string;
  flowId: string;
  verdict: CollectionVerdict;
  scanId?: string | null;
  stepUrl?: string | null;
  overallScore?: number | null;
}): Promise<
  | { ok: true; waveEvaluateOk: true; waveRollupOk: true }
  | { ok: false; waveEvaluateOk: boolean; waveRollupOk: false; error: string }
> {
  const evaluated = await evaluateStudyWave({
    studyId: input.studyId,
    waveId: input.waveId,
  });
  if (!evaluated.ok) {
    return {
      ok: false,
      waveEvaluateOk: false,
      waveRollupOk: false,
      error: evaluated.error,
    };
  }

  // Prefer post-evaluate snapshot; fall back to GET if evaluate payload is thin.
  let wave = evaluated.wave;
  if (!wave.waveKey) {
    const fetched = await fetchStudyWave({
      studyId: input.studyId,
      waveId: input.waveId,
    });
    if (fetched.ok) wave = fetched.wave;
  }

  const collectionNotes = buildCollectionSoftQNotes({
    verdict: input.verdict,
    flowId: input.flowId,
    scanId: input.scanId,
    overallScore: input.overallScore,
  });
  const notes = mergeEvaluationNotes(wave.evaluation?.notes, collectionNotes);
  const reportMarkdown = buildCollectionReportMarkdown({
    verdict: input.verdict,
    flowId: input.flowId,
    platformProjectId: input.platformProjectId,
    scanId: input.scanId,
    stepUrl: input.stepUrl,
    overallScore: input.overallScore,
    priorReport: wave.reportMarkdown,
  });

  const auth = requireAuthHeaders();
  if (!auth.ok) {
    return {
      ok: false,
      waveEvaluateOk: true,
      waveRollupOk: false,
      error: auth.error,
    };
  }

  try {
    const res = await fetch(audionPlatformStudyWave(input.studyId, input.waveId), {
      method: 'PATCH',
      headers: auth.headers,
      body: JSON.stringify({
        waveKey: wave.waveKey || 'default',
        reportMarkdown,
        evaluation: {
          ...(wave.evaluation ?? {}),
          notes,
          // Preserve Soft-Q scores from evaluate; Collection only appends notes.
          softScores: wave.evaluation?.softScores ?? {},
        },
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        waveEvaluateOk: true,
        waveRollupOk: false,
        error: `AUDION wave PATCH: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    return { ok: true, waveEvaluateOk: true, waveRollupOk: true };
  } catch (e) {
    return {
      ok: false,
      waveEvaluateOk: true,
      waveRollupOk: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type AudionJourneyStartOnlyResult =
  | { ok: true; studyId: string; waveId: string; jobId: string }
  | { ok: false; error: string; studyId?: string; waveId?: string };

/**
 * Create Study/Wave from embedded flow and start it — no poll (Wave 6 live board run).
 * The caller (board) polls `fetchJourneyJob` client-side via the journey-jobs proxy route.
 */
export async function startAudionJourneySegment(input: {
  projectId: string;
  flow: EmbeddedAudionJourneyFlow;
  name?: string;
}): Promise<AudionJourneyStartOnlyResult> {
  const created = await createStudyFromFlow(input);
  if (!created.ok) return created;

  const started = await startStudyWave({
    studyId: created.studyId,
    waveId: created.waveId,
  });
  if (!started.ok) {
    return {
      ok: false,
      error: started.error,
      studyId: created.studyId,
      waveId: created.waveId,
    };
  }

  return {
    ok: true,
    studyId: created.studyId,
    waveId: created.waveId,
    jobId: started.jobId,
  };
}

/** Create Study/Wave from embedded flow, start, poll to terminal, optional sync. */
export async function runAudionJourneySegment(input: {
  projectId: string;
  flow: EmbeddedAudionJourneyFlow;
  name?: string;
}): Promise<AudionJourneySegmentResult> {
  const created = await createStudyFromFlow(input);
  if (!created.ok) return created;

  const started = await startStudyWave({
    studyId: created.studyId,
    waveId: created.waveId,
  });
  if (!started.ok) {
    return {
      ok: false,
      error: started.error,
      studyId: created.studyId,
      waveId: created.waveId,
    };
  }

  const polled = await pollJourneyJob(started.jobId);
  if (!polled.ok) {
    return {
      ok: false,
      error: polled.error,
      studyId: created.studyId,
      waveId: created.waveId,
      jobId: started.jobId,
    };
  }

  // Best-effort sync for Phase 7 wave fields
  await syncStudyWave({ studyId: created.studyId, waveId: created.waveId });

  if (polled.value.status === 'error') {
    return {
      ok: false,
      error: polled.value.error || 'Journey job error',
      studyId: created.studyId,
      waveId: created.waveId,
      jobId: started.jobId,
      job: polled.value,
    };
  }

  return {
    ok: true,
    studyId: created.studyId,
    waveId: created.waveId,
    jobId: started.jobId,
    job: polled.value,
  };
}
