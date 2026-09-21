/* ------------------------------------------------------------------ */
/*  PLEXON – POST /api/auth/request-password-reset                    */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, handleApiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, requestPasswordResetBodySchema } from '@/lib/api-schemas';
import { createPasswordResetTokenForEmail } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/send-password-reset-email';

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return apiError('Server misconfiguration: database not configured.', API_STATUS.UNAVAILABLE);
  }
  try {
    const parsed = await parseApiBody(request, requestPasswordResetBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const email = parsed.email.trim().toLowerCase();

    const created = await createPasswordResetTokenForEmail(email);
    if (!created) {
      return NextResponse.json({ ok: true });
    }

    await sendPasswordResetEmail(email, created.plainToken);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, { context: 'request-password-reset', publicMessage: 'Request failed.' });
  }
}
