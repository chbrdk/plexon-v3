/**
 * Scene hit label helpers — same semantics as videon-v3 `lib/scene-hit-model.ts`.
 * Spec: videon-v3/specs/domain/scene-hit-model.md · assistant-videon-mcp.md
 */

export type SceneHitTimingFields = {
  startMs?: number | null
  endMs?: number | null
  sceneKey?: string | null
}

export function formatSceneHitClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function sceneHitAtMs(hit: SceneHitTimingFields): number {
  if (typeof hit.startMs === 'number' && hit.startMs >= 0) return hit.startMs;
  if (typeof hit.endMs === 'number') return Math.max(0, Math.floor(hit.endMs / 2));
  return 1000;
}

export function sceneHitTimingLabel(hit: SceneHitTimingFields): string | undefined {
  if (typeof hit.startMs === 'number' && typeof hit.endMs === 'number') {
    return `${formatSceneHitClock(hit.startMs)}–${formatSceneHitClock(hit.endMs)}`;
  }
  if (typeof hit.startMs === 'number') return formatSceneHitClock(hit.startMs);
  return undefined;
}

export function sceneHitDurationLabel(hit: SceneHitTimingFields): string | undefined {
  if (
    typeof hit.startMs !== 'number' ||
    typeof hit.endMs !== 'number' ||
    hit.endMs < hit.startMs
  ) {
    return undefined;
  }
  return formatSceneHitClock(hit.endMs - hit.startMs);
}

export function sceneHitOrdinalLabel(hit: SceneHitTimingFields, index: number): string {
  const raw = hit.sceneKey?.trim();
  if (raw) {
    const match = raw.match(/(\d+)/);
    if (match) return `Szene ${Number(match[1])}`;
    return raw;
  }
  return `Szene ${index + 1}`;
}
