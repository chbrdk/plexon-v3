/**
 * Apply idempotent SQL migration files (Enterprise).
 * Used when drizzle-kit push is interactive / ambiguous on new tables.
 */
import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '../lib/db/migrations')

const FILES = [
  '0020_suite_enterprise_client_room_audit.sql',
  '0021_suite_enterprise_activity_brief_directory.sql',
]

async function main() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    console.warn('[PLEXON] apply-sql-migrations: DATABASE_URL missing — skip')
    return
  }
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    for (const file of FILES) {
      const full = path.join(migrationsDir, file)
      const sql = readFileSync(full, 'utf8')
      console.info(`[PLEXON] applying ${file}...`)
      await client.query(sql)
      console.info(`[PLEXON] applied ${file}`)
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('[PLEXON] apply-sql-migrations failed', e instanceof Error ? e.message : e)
  process.exit(1)
})
