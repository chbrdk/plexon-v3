import { describe, expect, it } from 'vitest';
import { users, USER_ROLE } from '@/lib/db/schema';

/** Ensures schema loads without path-alias breakage for drizzle-kit push in Docker. */
describe('db schema', () => {
  it('exports users table and role constants', () => {
    expect(users).toBeTruthy();
    expect(USER_ROLE.USER).toBe('user');
    expect(USER_ROLE.ADMIN).toBe('admin');
  });
});
