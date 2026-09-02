#!/bin/sh
set -e

if [ -z "$AUTH_SECRET" ] || [ "${#AUTH_SECRET}" -lt 32 ]; then
  echo "[PLEXON] AUTH_SECRET is missing or shorter than 32 chars (Runtime env). Refusing to start."
  exit 1
fi

if [ -n "$DATABASE_URL" ]; then
  echo "[PLEXON] Checking DATABASE_URL..."
  node ./scripts/check-database-url.mjs

  echo "[PLEXON] Running drizzle-kit push..."
  if npx drizzle-kit push; then
    echo "[PLEXON] Schema up to date."
  else
    echo "[PLEXON] drizzle-kit push failed (DB unreachable or schema error). Refusing to start."
    exit 1
  fi

  echo "[PLEXON] Vaillant Group MaFo flow bootstrap (idempotent)..."
  if npx tsx scripts/bootstrap-vaillant-group-mafo.ts --corpus-no-wait; then
    echo "[PLEXON] Vaillant Group flow bootstrap complete."
    echo "[PLEXON] Vaillant Group MaFo auto-run UC1+UC2 (if pending, background)..."
    npx tsx scripts/run-vaillant-group-mafo-flow.ts --all --if-pending &
  else
    echo "[PLEXON] Vaillant Group flow bootstrap failed (non-fatal)."
  fi
else
  echo "[PLEXON] DATABASE_URL not set, skipping schema push."
fi

# CHECKION user → PLEXON sync is NOT run at startup (it used to overwrite password_hash on every deploy).
# One-time manual only: npm run migrate:checkion-users (see knowledge/plexon-setup.md).

# CHECKION/AUDION → PLEXON platform_projects + bindings (Coolify: MIGRATION_MSQDX_PLATFORM_PROJECTS=1 + DB URLs)
if [ -n "${MIGRATION_MSQDX_PLATFORM_PROJECTS:-}" ] && [ "${MIGRATION_MSQDX_PLATFORM_PROJECTS}" != "0" ] && [ "${MIGRATION_MSQDX_PLATFORM_PROJECTS}" != "false" ]; then
  _CHK="${CHECKION_DATABASE_URL:-}${MIGRATION_CHECKION_DATABASE_URL:-}"
  _AUD="${AUDION_DATABASE_URL:-}${MIGRATION_AUDION_DATABASE_URL:-}"
  if [ -n "$_CHK" ] && [ -n "$_AUD" ]; then
    echo "[PLEXON] Running CHECKION/AUDION → PLEXON platform project migration (msqdx company)..."
    node ./scripts/migrate-product-projects-to-msqdx-company.mjs || echo "[PLEXON] Platform project migration failed. App will start anyway."
  else
    echo "[PLEXON] MIGRATION_MSQDX_PLATFORM_PROJECTS is enabled but CHECKION_DATABASE_URL (or MIGRATION_CHECKION_DATABASE_URL) and AUDION_DATABASE_URL (or MIGRATION_AUDION_DATABASE_URL) are not both set — skipping platform project migration."
  fi
fi

exec npm run start
