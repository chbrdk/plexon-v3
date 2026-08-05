/**
 * Webhook secret helpers for Collection Test Flow triggers (Wave 15).
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const WHSEC_PREFIX = 'whsec_';

export function hashWebhookSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function issueWebhookSecret(): { secret: string; hash: string; hint: string } {
  const secret = `${WHSEC_PREFIX}${randomBytes(24).toString('base64url')}`;
  return {
    secret,
    hash: hashWebhookSecret(secret),
    hint: secret.slice(-4),
  };
}

export function verifyWebhookSecret(presented: string, hash: string | null | undefined): boolean {
  if (!hash || !presented) return false;
  const a = Buffer.from(hashWebhookSecret(presented), 'utf8');
  const b = Buffer.from(hash, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Bearer whsec_… or X-Flow-Webhook-Secret / X-Service-Secret style header. */
export function readWebhookSecretFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization')?.trim() ?? '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const header =
    request.headers.get('x-flow-webhook-secret')?.trim() ||
    request.headers.get('x-webhook-secret')?.trim() ||
    '';
  return header || null;
}

export type ClosedFlowTriggerBody = {
  url?: string;
  companyName?: string;
  callbackUrl?: string;
};

export function parseClosedFlowTriggerBody(raw: unknown): ClosedFlowTriggerBody {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const body = raw as Record<string, unknown>;
  const out: ClosedFlowTriggerBody = {};
  if (typeof body.url === 'string' && body.url.trim()) out.url = body.url.trim();
  if (typeof body.companyName === 'string' && body.companyName.trim()) {
    out.companyName = body.companyName.trim();
  }
  if (typeof body.callbackUrl === 'string' && body.callbackUrl.trim()) {
    const cb = body.callbackUrl.trim();
    if (cb.startsWith('https://') || cb.startsWith('http://')) out.callbackUrl = cb;
  }
  return out;
}
