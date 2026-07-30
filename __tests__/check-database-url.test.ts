import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const script = path.join(process.cwd(), 'scripts/check-database-url.mjs');

describe('check-database-url', () => {
  it('rejects hostname base', () => {
    const r = spawnSync(process.execPath, [script], {
      env: { ...process.env, DATABASE_URL: 'postgresql://u:p@base:5432/plexon' },
      encoding: 'utf8',
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/base/i);
  });

  it('accepts service-style host', () => {
    const r = spawnSync(process.execPath, [script], {
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://u:p@plexon-v3-postgres:5432/plexon',
      },
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/host=plexon-v3-postgres/);
  });
});
