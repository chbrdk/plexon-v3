import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import {
  checkionApiGeoEeatProject,
  checkionApiScanProject,
  checkionApiScansDomainProject,
} from '@/lib/paths/checkion-api';

export type CheckionAssignKind = 'scan' | 'domain_scan' | 'geo_eeat';

export type CheckionAssignResult =
  | { ok: true }
  | { ok: false; error: string };

function assignUrl(kind: CheckionAssignKind, resourceId: string): string {
  if (kind === 'scan') return checkionApiScanProject(resourceId);
  if (kind === 'domain_scan') return checkionApiScansDomainProject(resourceId);
  return checkionApiGeoEeatProject(resourceId);
}

export async function assignCheckionResourceToProject(input: {
  kind: CheckionAssignKind;
  resourceId: string;
  projectId: string;
}): Promise<CheckionAssignResult> {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  const resourceId = input.resourceId.trim();
  const projectId = input.projectId.trim();
  if (!resourceId || !projectId) {
    return { ok: false, error: 'resourceId oder projectId fehlt' };
  }

  try {
    const res = await fetch(assignUrl(input.kind, resourceId), {
      method: 'PATCH',
      headers: auth.headers,
      body: JSON.stringify({ projectId }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Assign ${input.kind}: HTTP ${res.status} – ${body.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
