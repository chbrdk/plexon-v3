import { getAudionServiceToken } from '@/lib/constants';
import {
  audionApiProjectResearchLatest,
  audionApiProjectResearchStart,
  audionApiProjectResearchStatus,
} from '@/lib/paths/audion-api';

export type AudionResearchStartResult = {
  ok: boolean;
  runId?: string;
  error?: string;
};

export type AudionResearchPollResult = {
  ok: boolean;
  status?: string;
  progress?: number;
  summary?: Record<string, unknown> | null;
  error?: string;
};

function audionHeaders(plexonUserId: string): Record<string, string> {
  const token = getAudionServiceToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Plexon-User-Id': plexonUserId,
  };
}

export async function startAudionProjectResearch(
  audionProjectId: string,
  plexonUserId: string,
  options: { seedUrl?: string } = {}
): Promise<AudionResearchStartResult> {
  const token = getAudionServiceToken();
  if (!token) {
    return { ok: false, error: 'AUDION_API_TOKEN not configured' };
  }
  const url = audionApiProjectResearchStart(audionProjectId);
  const response = await fetch(url, {
    method: 'POST',
    headers: audionHeaders(plexonUserId),
    body: JSON.stringify({
      ...(options.seedUrl ? { seed_url: options.seedUrl } : {}),
    }),
    cache: 'no-store',
  });
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const err =
      (data && typeof data.detail === 'string' ? data.detail : null) ||
      (data && typeof data.error === 'string' ? data.error : null) ||
      text ||
      response.statusText;
    return { ok: false, error: err };
  }
  const runId =
    (typeof data?.run_id === 'string' ? data.run_id : null) ||
    (typeof data?.runId === 'string' ? data.runId : null) ||
    undefined;
  return { ok: true, runId };
}

export async function pollAudionProjectResearch(
  audionProjectId: string,
  runId: string,
  plexonUserId: string
): Promise<AudionResearchPollResult> {
  const token = getAudionServiceToken();
  if (!token) {
    return { ok: false, error: 'AUDION_API_TOKEN not configured' };
  }
  const url = audionApiProjectResearchStatus(audionProjectId, runId);
  const response = await fetch(url, {
    method: 'GET',
    headers: audionHeaders(plexonUserId),
    cache: 'no-store',
  });
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    return { ok: false, error: text || response.statusText };
  }
  const status = typeof data?.status === 'string' ? data.status : undefined;
  const progress = typeof data?.progress === 'number' ? data.progress : undefined;
  return { ok: true, status, progress };
}

export async function fetchAudionProjectResearchLatest(
  audionProjectId: string,
  plexonUserId: string
): Promise<AudionResearchPollResult> {
  const token = getAudionServiceToken();
  if (!token) {
    return { ok: false, error: 'AUDION_API_TOKEN not configured' };
  }
  const url = audionApiProjectResearchLatest(audionProjectId);
  const response = await fetch(url, {
    method: 'GET',
    headers: audionHeaders(plexonUserId),
    cache: 'no-store',
  });
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    return { ok: false, error: text || response.statusText };
  }
  return { ok: true, status: 'completed', summary: data };
}
