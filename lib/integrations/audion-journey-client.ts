/**
 * AUDION Study/Wave journey segment via platform BFF (not FastAPI).
 * Spec: collection-test-flow.md Wave 2
 */

import { getAudionServiceToken } from '@/lib/constants';
import { pollUntil } from '@/lib/assistant/poll-until';
import type { CollectionVerdict, EmbeddedAudionJourneyFlow } from '@/lib/collection-test-flow';
import {
  audionPlatformJourneyJob,
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

export type AudionJourneyJobSnapshot = {
  jobId: string;
  status: string;
  finalUrl: string | null;
  success: boolean | null;
  taskCompleted: boolean;
  validEvidence: boolean;
  error?: string | null;
  gateSignals?: Record<string, unknown> | null;
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

  return {
    jobId,
    status,
    finalUrl,
    success,
    taskCompleted,
    validEvidence,
    error,
    gateSignals: gate,
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
