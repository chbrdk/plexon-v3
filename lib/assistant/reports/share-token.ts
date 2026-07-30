import { createHash, randomBytes } from 'crypto';

export function generateReportShareToken(): string {
  return `rpt_${randomBytes(32).toString('hex')}`;
}

export function hashReportShareToken(plain: string): string {
  return createHash('sha256').update(plain.trim(), 'utf8').digest('hex');
}
