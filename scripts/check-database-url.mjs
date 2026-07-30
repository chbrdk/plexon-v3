#!/usr/bin/env node
/**
 * Startup guard: print safe DATABASE_URL diagnostics (no password) and fail on known-bad hosts.
 */
const urlRaw = process.env.DATABASE_URL?.trim();
if (!urlRaw) {
  console.error('[PLEXON] DATABASE_URL is unset.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(urlRaw);
} catch {
  console.error('[PLEXON] DATABASE_URL is not a valid URL. Check Coolify env (Runtime).');
  process.exit(1);
}

const host = parsed.hostname || '(empty)';
const port = parsed.port || '5432';
const dbName = parsed.pathname?.replace(/^\//, '') || '(none)';
const user = decodeURIComponent(parsed.username || '');

console.log(
  `[PLEXON] DATABASE_URL ok-ish → user=${user || '(none)'} host=${host} port=${port} database=${dbName}`,
);

const badHosts = new Set(['', 'base', 'localhost', '127.0.0.1', '0.0.0.0']);
if (badHosts.has(host)) {
  console.error(
    `[PLEXON] DATABASE_URL hostname "${host}" is invalid for Coolify. ` +
      'Use the Postgres resource Internal URL (host = service name, e.g. plexon-v3-postgres), not a placeholder.',
  );
  process.exit(1);
}

if (host.includes('{{') || host.includes('}}')) {
  console.error('[PLEXON] DATABASE_URL still contains Coolify template braces — expansion failed.');
  process.exit(1);
}

process.exit(0);
