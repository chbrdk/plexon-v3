/**
 * Zod schemas for PLEXON API (register, etc.).
 */
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from './api-error-handler';

const PASSWORD_MIN_LENGTH = 8;
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((p) => /[A-Z]/.test(p), 'Password must contain at least one uppercase letter')
  .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
  .refine((p) => /\d/.test(p), 'Password must contain at least one digit');

export const registerBodySchema = z.object({
  email: z.string().email('Valid email required'),
  password: passwordSchema,
  name: z.string().optional(),
});

/** POST /api/auth/change-password */
export const changePasswordBodySchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
});

/** POST /api/auth/request-password-reset */
export const requestPasswordResetBodySchema = z.object({
  email: z.string().email('Valid email required'),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(16, 'Token is required'),
  new_password: passwordSchema,
});

/** POST /api/auth/validate-credentials (for CHECKION/AUDION etc.: validate login, return user) */
export const validateCredentialsBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return 'Validation failed';
  const path = first.path?.length ? first.path.join('.') + ': ' : '';
  const msg = typeof first.message === 'string' ? first.message : 'Invalid value';
  return path + msg;
}

export async function parseApiBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<NextResponse | T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  return apiError(formatZodError(result.error), API_STATUS.BAD_REQUEST);
}
