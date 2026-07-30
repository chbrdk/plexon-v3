import { describe, expect, it } from 'vitest';

/** Mirrors scripts/migrate-product-projects-to-msqdx-company.mjs AUDION_SCHEMA guard. */
function isSafeSqlIdentifier(name: string): boolean {
  return /^[_a-z][_a-z0-9]*$/i.test(name);
}

describe('migration AUDION schema identifier guard', () => {
  it('allows default audion schema', () => {
    expect(isSafeSqlIdentifier('audion')).toBe(true);
  });
  it('rejects injection-like values', () => {
    expect(isSafeSqlIdentifier('audion;drop')).toBe(false);
    expect(isSafeSqlIdentifier('1audion')).toBe(false);
    expect(isSafeSqlIdentifier('')).toBe(false);
  });
});
