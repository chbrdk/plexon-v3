/**
 * POST /api/assistant/continuity — client beacon for remount / empty-done.
 * Spec: specs/domain/central-assistant-flyout.md § Continuity observability
 */

import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  ASSISTANT_CONTINUITY_EVENT_TYPES,
  type AssistantContinuityEventType,
} from '@/lib/assistant/stream-continuity-telemetry';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';

const MAX_ID_LEN = 128;
const PRESENTATIONS = new Set(['overlay', 'expand']);

function asTrimmedId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t || t.length > MAX_ID_LEN) return null;
  return t;
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
    }

    const type = typeof body.type === 'string' ? body.type.trim() : '';
    if (!(ASSISTANT_CONTINUITY_EVENT_TYPES as readonly string[]).includes(type)) {
      return apiError('Invalid continuity type', API_STATUS.BAD_REQUEST);
    }

    const conversationId = asTrimmedId(body.conversationId);
    const streamId = asTrimmedId(body.streamId);
    const presentationRaw =
      typeof body.presentation === 'string' ? body.presentation.trim() : '';
    const presentation = PRESENTATIONS.has(presentationRaw)
      ? presentationRaw
      : presentationRaw
        ? 'other'
        : null;
    const hasUiLayout =
      typeof body.hasUiLayout === 'boolean' ? body.hasUiLayout : null;

    console.info('[assistant/continuity]', type, {
      userId: user.id,
      conversationId,
      presentation,
      hasUiLayout,
      streamId,
      source: 'beacon',
    });

    await recordAssistantUsageEvent({
      userId: user.id,
      eventType: 'assistant_continuity',
      rawUnits: {
        continuityType: type as AssistantContinuityEventType,
        conversationId,
        presentation,
        hasUiLayout,
        streamId,
      },
    });

    return Response.json({ ok: true });
  } catch (e) {
    return handleApiError(e, { context: 'assistant/continuity' });
  }
}
