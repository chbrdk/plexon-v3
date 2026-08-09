/** Parse GET /api/admin/usage/events query string (shared with tests). */

export const ADMIN_USAGE_EVENTS_SERVICES = ['checkion', 'audion', 'videon', 'brandion'] as const;
export type AdminUsageEventsService = (typeof ADMIN_USAGE_EVENTS_SERVICES)[number];

export type ParsedAdminUsageEventsParams = {
  limit: number;
  offset: number;
  userId?: string;
  service?: AdminUsageEventsService;
  eventType?: string;
};

function clampInt(v: string | null, def: number, min: number, max: number): number {
  const n = Number.parseInt(v ?? '', 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export function parseAdminUsageEventsParams(
  searchParams: URLSearchParams
): { ok: true; value: ParsedAdminUsageEventsParams } | { ok: false; error: string } {
  const limit = clampInt(searchParams.get('limit'), 100, 1, 500);
  const offset = clampInt(searchParams.get('offset'), 0, 0, 1_000_000);

  const userIdRaw = searchParams.get('userId')?.trim();
  const userId = userIdRaw && userIdRaw.length > 0 ? userIdRaw : undefined;

  const serviceRaw = searchParams.get('service')?.trim().toLowerCase();
  let service: AdminUsageEventsService | undefined;
  if (serviceRaw) {
    if (!ADMIN_USAGE_EVENTS_SERVICES.includes(serviceRaw as AdminUsageEventsService)) {
      return { ok: false, error: 'Invalid service' };
    }
    service = serviceRaw as AdminUsageEventsService;
  }

  const eventTypeRaw = searchParams.get('eventType')?.trim();
  const eventType = eventTypeRaw && eventTypeRaw.length > 0 ? eventTypeRaw : undefined;

  return {
    ok: true,
    value: { limit, offset, userId, service, eventType },
  };
}
