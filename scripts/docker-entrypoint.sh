#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[PLEXON] Running drizzle-kit push..."
  if npx drizzle-kit push; then
    echo "[PLEXON] Schema up to date."
  else
    echo "[PLEXON] drizzle-kit push failed (DB unreachable or schema error). App will start anyway."
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
