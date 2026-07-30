import { NextRequest, NextResponse } from 'next/server';
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  handleAssistantComplete,
  type AssistantCompleteBody,
} from '@/lib/assistant/complete-handler';

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

    let body: AssistantCompleteBody;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
    }

    try {
      const result = await handleAssistantComplete(user, body);
      return NextResponse.json(result);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 502 || err.message.includes('Claude API')) {
        return NextResponse.json(
          { error: 'Claude API request failed', details: err.message },
          { status: 502 }
        );
      }
      if (err.status) {
        return apiError(err.message, err.status);
      }
      throw e;
    }
  } catch (e) {
    return handleApiError(e, { context: 'assistant/complete' });
  }
}
