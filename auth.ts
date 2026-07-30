/* ------------------------------------------------------------------ */
/*  PLEXON – NextAuth v5 (Auth.js) with Credentials                    */
/* ------------------------------------------------------------------ */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

import { emailDomainForLog } from '@/lib/auth-credentials-log';
import { getDb } from '@/lib/db';
import { users, USER_ROLE } from '@/lib/db/schema';
import { PATH_LOGIN } from '@/lib/constants';

const AUTH_SECRET = process.env.AUTH_SECRET;
const ADMIN_EMAIL = process.env.PLEXON_ADMIN_EMAIL?.trim().toLowerCase();
if (process.env.NODE_ENV === 'production' && (!AUTH_SECRET || AUTH_SECRET.length < 32)) {
  console.error('[PLEXON] AUTH_SECRET is missing or too short (min 32 chars). Set AUTH_SECRET in production.');
}

const DEMO_EMAIL = process.env.PLEXON_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.PLEXON_DEMO_PASSWORD;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: AUTH_SECRET || undefined,
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('[PLEXON] auth.credentials', { outcome: 'denied', reason: 'missing_credentials' });
          return null;
        }
        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        // Demo user (optional, when DATABASE_URL not set)
        if (DEMO_EMAIL && DEMO_PASSWORD && email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          const demoRole = ADMIN_EMAIL && email === ADMIN_EMAIL ? USER_ROLE.ADMIN : USER_ROLE.USER;
          return { id: 'demo', email, name: 'Demo User', role: demoRole };
        }

        if (!process.env.DATABASE_URL) {
          console.warn('[PLEXON] auth.credentials', { outcome: 'denied', reason: 'no_database_url' });
          return null;
        }
        try {
          const db = getDb();
          const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (!user) {
            console.warn('[PLEXON] auth.credentials', {
              outcome: 'denied',
              reason: 'user_not_found',
              email_domain: emailDomainForLog(email),
            });
            return null;
          }
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) {
            console.warn('[PLEXON] auth.credentials', {
              outcome: 'denied',
              reason: 'invalid_password',
              email_domain: emailDomainForLog(email),
            });
            return null;
          }
          let role = (user as { role?: string }).role ?? USER_ROLE.USER;
          if (ADMIN_EMAIL && email === ADMIN_EMAIL && role !== USER_ROLE.ADMIN) {
            await db.update(users).set({ role: USER_ROLE.ADMIN }).where(eq(users.id, user.id));
            role = USER_ROLE.ADMIN;
          }
          return { id: user.id, email: user.email, name: user.name ?? undefined, role };
        } catch (e) {
          console.error('[PLEXON] auth.credentials', { outcome: 'error', reason: 'exception' }, e);
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: PATH_LOGIN },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role ?? USER_ROLE.USER;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.email = token.email ?? '';
        session.user.name = token.name ?? null;
        let role = (token.role as string) ?? USER_ROLE.USER;
        if (token.sub && token.sub !== 'demo' && process.env.DATABASE_URL) {
          try {
            const db = getDb();
            const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, token.sub)).limit(1);
            if (row?.role) role = row.role as string;
          } catch {
            // keep token role
          }
        }
        session.user.role = role;
      }
      return session;
    },
  },
});
