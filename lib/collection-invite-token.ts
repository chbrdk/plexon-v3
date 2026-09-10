import { createHash, randomBytes } from 'crypto';

export function generateCollectionInviteToken(): string {
  return `inv_${randomBytes(32).toString('hex')}`;
}

export function hashCollectionInviteToken(plain: string): string {
  return createHash('sha256').update(plain.trim(), 'utf8').digest('hex');
}
