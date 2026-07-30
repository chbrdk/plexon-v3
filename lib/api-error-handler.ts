/**
 * API error handling for PLEXON (consistent error responses).
 */
import { NextResponse } from 'next/server';
import { attachPlatformHeaders } from '@/lib/platform-contract';

export const API_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  UNAVAILABLE: 503,
} as const;

export type ApiStatus = (typeof API_STATUS)[keyof typeof API_STATUS];

export function apiError(
  message: string,
  status: ApiStatus | number = API_STATUS.INTERNAL_ERROR
): NextResponse {
  return attachPlatformHeaders(NextResponse.json({ error: message }, { status }));
}

export function handleApiError(
  e: unknown,
  options?: { context?: string; publicMessage?: string }
): NextResponse {
  const { context, publicMessage } = options ?? {};
  const prefix = context ? `[PLEXON] ${context}: ` : '[PLEXON] ';
  console.error(prefix, e);
  return apiError(publicMessage ?? 'An unexpected error occurred.', API_STATUS.INTERNAL_ERROR);
}
