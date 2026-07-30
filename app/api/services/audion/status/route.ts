/* ------------------------------------------------------------------ */
/*  PLEXON – GET /api/services/audion/status (Admin: AUDION-Konnektivität) */
/* ------------------------------------------------------------------ */

import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { platformJson } from '@/lib/platform-contract';
import {
  formatAudionMisconfigHint,
  getAudionUrlDiagnostics,
  probeAudionApiHealth,
} from '@/lib/integrations/audion-connectivity';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);

  const diagnostics = getAudionUrlDiagnostics();
  const probe = await probeAudionApiHealth();

  return platformJson({
    configured: diagnostics.hasToken && diagnostics.apiUrlExplicit && !diagnostics.looksLikeWebApp,
    healthy: probe.ok,
    diagnostics,
    probe: {
      ok: probe.ok,
      status: probe.status ?? null,
      hint: probe.hint ?? formatAudionMisconfigHint(diagnostics),
    },
  });
}
