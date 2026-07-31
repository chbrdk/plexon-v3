import {
  getAudionPlatformApiBase,
  getCheckionServiceApiUrl,
} from '@/lib/constants';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';

export type CheckionProjectSummary = {
  externalProjectId: string;
  scanCount: number;
};

export type AudionCatalogTargetGroup = {
  id: string;
  name: string;
  segment: string;
  personaCount: number;
  status: string;
};

export type AudionCatalogPersona = {
  id: string;
  name: string;
  role: string;
  status: string;
  targetGroupId?: string | null;
};

export type AudionProjectSummary = {
  externalProjectId: string;
  personaCount: number;
  targetGroupCount: number;
  targetGroups: AudionCatalogTargetGroup[];
  personas: AudionCatalogPersona[];
};

function normalizeAudionSummary(data: AudionProjectSummary): AudionProjectSummary | null {
  if (!data?.externalProjectId) return null;
  return {
    externalProjectId: data.externalProjectId,
    personaCount: Number(data.personaCount) || 0,
    targetGroupCount: Number(data.targetGroupCount) || 0,
    targetGroups: Array.isArray(data.targetGroups) ? data.targetGroups : [],
    personas: Array.isArray(data.personas) ? data.personas : [],
  };
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchCheckionPlatformProjectSummary(
  platformProjectId: string,
  plexonUserId: string
): Promise<CheckionProjectSummary | null> {
  const base = getCheckionServiceApiUrl();
  const secret = process.env.PLEXON_SERVICE_SECRET?.trim();
  if (!base?.trim() || !secret) return null;
  const url = `${base.replace(/\/+$/, '')}/api/platform/provisioning/projects/${encodeURIComponent(platformProjectId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      [PLEXON_SERVICE_SECRET_HEADER]: secret,
      [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
      'X-Plexon-User-Id': plexonUserId,
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await readJson<CheckionProjectSummary>(response);
  if (!data?.externalProjectId) return null;
  return data;
}

export async function fetchAudionPlatformProjectSummary(
  platformProjectId: string,
  plexonUserId: string
): Promise<AudionProjectSummary | null> {
  const base = getAudionPlatformApiBase();
  const secret = process.env.PLEXON_SERVICE_SECRET?.trim();
  if (!base?.trim() || !secret) return null;
  const url = `${base.replace(/\/+$/, '')}/platform/provisioning/projects/${encodeURIComponent(platformProjectId)}`;
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      [PLEXON_SERVICE_SECRET_HEADER]: secret,
      [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
      'X-Plexon-User-Id': plexonUserId,
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await readJson<AudionProjectSummary>(response);
  return data ? normalizeAudionSummary(data) : null;
}
