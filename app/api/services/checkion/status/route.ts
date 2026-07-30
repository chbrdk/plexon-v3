/* ------------------------------------------------------------------ */
/*  PLEXON – GET /api/services/checkion/status (Admin: CHECKION-Konnektivität) */
/* ------------------------------------------------------------------ */

import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { platformJson } from '@/lib/platform-contract';
import {
  formatCheckionMisconfigHint,
  getCheckionUrlDiagnostics,
  probeCheckionApiHealth,
} from '@/lib/integrations/checkion-connectivity';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);

  const diagnostics = getCheckionUrlDiagnostics();
  const probe = await probeCheckionApiHealth();

  return platformJson({
    configured: diagnostics.hasAssistantToken && diagnostics.assistantTokenFormatOk,
    adminUserManagementConfigured:
      diagnostics.hasAdminApiKey && Boolean(diagnostics.apiUrlPrefix),
    healthy: probe.ok,
    diagnostics,
    probe: {
      ok: probe.ok,
      status: probe.status ?? null,
      hint: probe.hint ?? formatCheckionMisconfigHint(diagnostics),
    },
  });
}
