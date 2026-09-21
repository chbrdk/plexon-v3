import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression: AUDION TG create must send both camelCase and snake_case project ids
 * so personas attach to the bound Audion project (not an unbound TG).
 */
describe('audion-persona-bootstrap-client project binding', () => {
  it('POSTs projectId and project_id on target-group create', () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/integrations/audion-persona-bootstrap-client.ts'),
      'utf8',
    );
    expect(src).toMatch(/projectId:\s*projectId/);
    expect(src).toMatch(/project_id:\s*projectId/);
  });
});
