/**
 * Encrypt Hub OAuth tokens at rest (AES-256-GCM).
 * Spec: specs/domain/mcp-hub-canva.md
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { runtimeEnv } from '@/lib/runtime-env';

const PREFIX = 'v1:';

function deriveKey(): Buffer {
  const raw = runtimeEnv('MCP_HUB_TOKEN_ENCRYPTION_KEY');
  if (!raw || raw.length < 16) {
    throw new Error('MCP_HUB_TOKEN_ENCRYPTION_KEY missing or too short (min 16 chars)');
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptHubSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptHubSecret(payload: string): string {
  if (!payload.startsWith(PREFIX)) {
    throw new Error('Unsupported Hub secret encoding');
  }
  const parts = payload.slice(PREFIX.length).split('.');
  if (parts.length !== 3) throw new Error('Invalid Hub secret payload');
  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64!, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64!, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64!, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function hubTokenEncryptionConfigured(): boolean {
  const raw = runtimeEnv('MCP_HUB_TOKEN_ENCRYPTION_KEY');
  return Boolean(raw && raw.length >= 16);
}
