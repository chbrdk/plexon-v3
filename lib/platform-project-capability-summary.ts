import type {
  AudionProjectSummary,
  CheckionProjectSummary,
} from '@/lib/platform-project-dashboard-fetch';

type BindingLike = {
  productId: string;
  externalProjectId: string | null;
  syncStatus: string;
};

/** Prefer live product summary; fall back to PLEXON binding when remote GET is unavailable. */
export function resolveCheckionCapability(
  live: CheckionProjectSummary | null,
  bindings: BindingLike[]
): CheckionProjectSummary | null {
  if (live?.externalProjectId) return live;
  const binding = bindings.find((b) => b.productId === 'checkion');
  const id = binding?.externalProjectId?.trim();
  if (!id) return null;
  return { externalProjectId: id, scanCount: 0 };
}

export function resolveAudionCapability(
  live: AudionProjectSummary | null,
  bindings: BindingLike[]
): AudionProjectSummary | null {
  if (live?.externalProjectId) return live;
  const binding = bindings.find((b) => b.productId === 'audion');
  const id = binding?.externalProjectId?.trim();
  if (!id) return null;
  return { externalProjectId: id, personaCount: 0 };
}
