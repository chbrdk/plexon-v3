import { NextResponse } from 'next/server';

export const PLEXON_FEDERATION_CONTRACT_VERSION = '2026-05-plexon-federation-v3';
export const PLEXON_CONTRACT_VERSION_HEADER = 'X-Plexon-Contract-Version';
export const PLEXON_SERVICE_SECRET_HEADER = 'X-Service-Secret';

export function attachPlatformHeaders(response: NextResponse): NextResponse {
  response.headers.set(PLEXON_CONTRACT_VERSION_HEADER, PLEXON_FEDERATION_CONTRACT_VERSION);
  return response;
}

export function platformJson<T>(body: T, init?: ResponseInit): NextResponse {
  return attachPlatformHeaders(NextResponse.json(body, init));
}

export function readServiceSecret(request: Request): string {
  return (
    request.headers.get(PLEXON_SERVICE_SECRET_HEADER) ??
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ??
    ''
  );
}
