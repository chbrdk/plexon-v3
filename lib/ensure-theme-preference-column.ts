import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'

let ensured = false

/** Idempotent column add for environments that only push partial schema. */
export async function ensureUsersThemePreferenceColumn(): Promise<void> {
  if (ensured) return
  if (!process.env.DATABASE_URL) return
  try {
    const db = getDb()
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "theme_preference" text`)
    ensured = true
  } catch {
    /* column may already exist under a different race; ignore */
  }
}
