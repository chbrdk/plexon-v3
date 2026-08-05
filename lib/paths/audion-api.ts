import { getAudionAdminUrl, getAudionPlatformApiBase, getAudionServiceApiUrl } from '@/lib/constants';

export function audionApiProjectsList(): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/projects`;
}

export function audionApiProjectsCreate(): string {
  return audionApiProjectsList();
}

export function audionApiProjectById(projectId: string): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/projects/${encodeURIComponent(projectId)}`;
}

export function pathAudionAdminProject(projectId: string): string {
  const admin = getAudionAdminUrl().replace(/\/+$/, '');
  return `${admin}/projects/${encodeURIComponent(projectId)}`;
}

export function audionApiProjectResearchStart(projectId: string): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/projects/${encodeURIComponent(projectId)}/research/start`;
}

export function audionApiProjectResearchStatus(projectId: string, runId: string): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  const params = new URLSearchParams({ run_id: runId });
  return `${base}/projects/${encodeURIComponent(projectId)}/research/status?${params}`;
}

export function audionApiProjectResearchLatest(projectId: string): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/projects/${encodeURIComponent(projectId)}/research/latest`;
}

export function audionApiTargetGroups(projectId?: string): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  if (!projectId) return `${base}/target-groups`;
  const params = new URLSearchParams({ project_id: projectId });
  return `${base}/target-groups?${params}`;
}

export function audionApiTargetGroupsCreate(): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/target-groups`;
}

/** Target-group scoped persona generation (works via FastAPI and Next.js /api proxy). */
export function audionApiTargetGroupPersonasGenerate(targetGroupId: string): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/target-groups/${encodeURIComponent(targetGroupId)}/personas/generate`;
}

/** Persona-voice GEO questions for PLEXON Quick Check (AUDION persona.geo_questions template). */
export function audionApiPersonaGeoQuestions(personaId: string): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/personas/${encodeURIComponent(personaId)}/geo-questions`;
}

export function audionApiTargetGroupKnowledge(targetGroupId: string): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/target-groups/${encodeURIComponent(targetGroupId)}/knowledge`;
}

export function audionApiTargetGroupChunks(targetGroupId: string, limit = 40): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  const params = new URLSearchParams({ limit: String(limit) });
  return `${base}/target-groups/${encodeURIComponent(targetGroupId)}/knowledge/chunks?${params}`;
}

export function audionApiTargetGroupChunkSimilar(
  targetGroupId: string,
  chunkId: string,
  limit = 6
): string {
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  const params = new URLSearchParams({ limit: String(limit) });
  return `${base}/target-groups/${encodeURIComponent(targetGroupId)}/knowledge/chunks/${encodeURIComponent(chunkId)}/similar?${params}`;
}

/** AUDION Next.js BFF base (`getAudionPlatformApiBase`) — Studies / journey agent. */
function audionPlatformBase(): string {
  return getAudionPlatformApiBase().replace(/\/+$/, '');
}

/** POST /api/studies/from-flow */
export function audionPlatformStudiesFromFlow(): string {
  return `${audionPlatformBase()}/studies/from-flow`;
}

/** POST /api/studies/{studyId}/waves/{waveId}/start */
export function audionPlatformStudyWaveStart(studyId: string, waveId: string): string {
  return `${audionPlatformBase()}/studies/${encodeURIComponent(studyId)}/waves/${encodeURIComponent(waveId)}/start`;
}

/** POST /api/studies/{studyId}/waves/{waveId}/sync */
export function audionPlatformStudyWaveSync(studyId: string, waveId: string): string {
  return `${audionPlatformBase()}/studies/${encodeURIComponent(studyId)}/waves/${encodeURIComponent(waveId)}/sync`;
}

/** GET /api/ux-journey-agent/run/{jobId} */
export function audionPlatformJourneyJob(jobId: string): string {
  return `${audionPlatformBase()}/ux-journey-agent/run/${encodeURIComponent(jobId)}`;
}
