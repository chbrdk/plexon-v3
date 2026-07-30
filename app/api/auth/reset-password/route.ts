/* ------------------------------------------------------------------ */
/*  PLEXON – POST /api/auth/reset-password                            */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { apiError, handleApiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, resetPasswordBodySchema } from '@/lib/api-schemas';
import { consumePasswordResetToken } from '@/lib/password-reset';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return apiError('Server misconfiguration: database not configured.', API_STATUS.UNAVAILABLE);
  }
  try {
    const parsed = await parseApiBody(request, resetPasswordBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const newHash = await bcrypt.hash(parsed.new_password, SALT_ROUNDS);
    const result = await consumePasswordResetToken(parsed.token, newHash);
    if (!result.ok) {
      const msg =
        result.reason === 'expired'
          ? 'Reset link expired. Request a new one.'
          : result.reason === 'used'
            ? 'This reset link was already used.'
            : 'Invalid or unknown reset link.';
      return apiError(msg, API_STATUS.BAD_REQUEST);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, { context: 'reset-password', publicMessage: 'Reset failed.' });
  }
}
