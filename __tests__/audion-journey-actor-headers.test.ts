import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('audion journey client actor wiring', () => {
  it('requireAuthHeaders takes plexonUserId via buildAudionMachineHeaders', () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/integrations/audion-journey-client.ts'),
      'utf8',
    );
    expect(src).toMatch(/buildAudionMachineHeaders/);
    expect(src).toMatch(/function requireAuthHeaders\(plexonUserId: string\)/);
    expect(src).not.toMatch(/requireAuthHeaders\(\)/);
    expect(src).toMatch(/plexonUserId: input\.plexonUserId/);
  });

  it('journey outline helpers use actor headers', () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/integrations/audion-journey-outline-client.ts'),
      'utf8',
    );
    expect(src).toMatch(/buildAudionMachineHeaders/);
    expect(src).not.toMatch(/getAudionServiceToken/);
  });
});
