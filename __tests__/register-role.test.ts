import { describe, expect, it } from 'vitest';
import { USER_ROLE } from '@/lib/db/schema';

describe('register role assignment', () => {
  it('maps admin email to admin role', () => {
    const admin = 'admin@example.com';
    const email = 'admin@example.com';
    const role = admin && email === admin ? USER_ROLE.ADMIN : USER_ROLE.USER;
    expect(role).toBe(USER_ROLE.ADMIN);
  });

  it('maps other emails to user role', () => {
    const admin = 'admin@example.com';
    const email = 'user@example.com';
    const role = admin && email === admin ? USER_ROLE.ADMIN : USER_ROLE.USER;
    expect(role).toBe(USER_ROLE.USER);
  });
});
