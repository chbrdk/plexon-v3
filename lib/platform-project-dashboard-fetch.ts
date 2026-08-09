import {
  getAudionPlatformApiBase,
  getBrandionServiceApiUrl,
  getCheckionServiceApiUrl,
} from '@/lib/constants';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';

export type CheckionCatalogDomainScan = {
  id: string;
  domain: string;
  status: string;
  score: number;
  timestamp: string;
  totalPages: number;
};

export type CheckionCatalogStandaloneScan = {
  id: string;
  url: string;
  score: number;
  timestamp: string;
};

export type CheckionProjectSummary = {
  externalProjectId: string;
  scanCount: number;
  domainScanCount: number;
  standaloneScanCount: number;
  domainScans: CheckionCatalogDomainScan[];
  standaloneScans: CheckionCatalogStandaloneScan[];
};

function normalizeCheckionSummary(data: CheckionProjectSummary): CheckionProjectSummary | null {
  if (!data?.externalProjectId) return null;
  const domainScans = Array.isArray(data.domainScans) ? data.domainScans : [];
  const standaloneScans = Array.isArray(data.standaloneScans) ? data.standaloneScans : [];
  const domainScanCount = Number(data.domainScanCount) || domainScans.length;
  const standaloneScanCount = Number(data.standaloneScanCount) || standaloneScans.length;
  const scanCount =
    Number(data.scanCount) || domainScanCount + standaloneScanCount;
  return {
    externalProjectId: data.externalProjectId,
    scanCount,
    domainScanCount,
    standaloneScanCount,
    domainScans,
    standaloneScans,
  };
}

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

export type AudionCatalogJourney = {
  id: string;
  name: string;
  status: string;
  journeyType: string;
  phaseCount: number;
  targetGroupName?: string | null;
};

export type AudionCatalogStudy = {
  id: string;
  name: string;
  status: string;
  waveCount: number;
  targetUrlKey?: string | null;
};

export type AudionProjectSummary = {
  externalProjectId: string;
  personaCount: number;
  targetGroupCount: number;
  journeyCount: number;
  studyCount: number;
  targetGroups: AudionCatalogTargetGroup[];
  personas: AudionCatalogPersona[];
  journeys: AudionCatalogJourney[];
  studies: AudionCatalogStudy[];
};

function normalizeAudionSummary(data: AudionProjectSummary): AudionProjectSummary | null {
  if (!data?.externalProjectId) return null;
  const journeys = Array.isArray(data.journeys) ? data.journeys : [];
  const studies = Array.isArray(data.studies) ? data.studies : [];
  return {
    externalProjectId: data.externalProjectId,
    personaCount: Number(data.personaCount) || 0,
    targetGroupCount: Number(data.targetGroupCount) || 0,
    journeyCount: Number(data.journeyCount) || journeys.length,
    studyCount: Number(data.studyCount) || studies.length,
    targetGroups: Array.isArray(data.targetGroups) ? data.targetGroups : [],
    personas: Array.isArray(data.personas) ? data.personas : [],
    journeys,
    studies,
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
  return data ? normalizeCheckionSummary(data) : null;
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

export type BrandionCatalogGuideline = {
  id: string;
  name: string;
  version: string;
  status: string;
  colorCount: number;
  typographyCount: number;
  spacingCount: number;
  pendingCount: number;
  updatedAt: string;
};

export type BrandionProjectSummary = {
  externalProjectId: string;
  platformProjectId?: string;
  analysisCount: number;
  guidelineCount: number;
  analyses: unknown[];
  guidelines: BrandionCatalogGuideline[];
};

function normalizeBrandionSummary(data: BrandionProjectSummary): BrandionProjectSummary | null {
  if (!data?.externalProjectId) return null;
  const guidelines = Array.isArray(data.guidelines) ? data.guidelines : [];
  return {
    externalProjectId: data.externalProjectId,
    platformProjectId: data.platformProjectId,
    analysisCount: Number(data.analysisCount) || 0,
    guidelineCount: Number(data.guidelineCount) || guidelines.length,
    analyses: Array.isArray(data.analyses) ? data.analyses : [],
    guidelines: guidelines.map((g) => ({
      id: String(g.id ?? ''),
      name: String(g.name ?? ''),
      version: String(g.version ?? ''),
      status: String(g.status ?? ''),
      colorCount: Number(g.colorCount) || 0,
      typographyCount: Number(g.typographyCount) || 0,
      spacingCount: Number(g.spacingCount) || 0,
      pendingCount: Number(g.pendingCount) || 0,
      updatedAt: String(g.updatedAt ?? ''),
    })),
  };
}

export async function fetchBrandionPlatformProjectSummary(
  platformProjectId: string,
  plexonUserId: string
): Promise<BrandionProjectSummary | null> {
  const base = getBrandionServiceApiUrl();
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
  const data = await readJson<BrandionProjectSummary>(response);
  return data ? normalizeBrandionSummary(data) : null;
}
