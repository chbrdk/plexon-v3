# AGENTS.md — PLEXON v3

1. Specs first. Update `specs/domain` or `specs/api` before changing behavior. UI cutover waves: `specs/domain/ui-migrate.md`.
2. Shared UI primitives come from `@msqdx/ui`. Do not create app-local replacements when the primitive belongs in `msqdx-ui`.
3. No hardcoded URLs, paths, or service bases. Use `lib/constants.ts` / `lib/shell-paths.ts` / `lib/runtime-env.ts` and document canonical values in `knowledge/paths.md`.
4. Tests with every change: UI smoke, contract checks, and build validation.
5. Prod control plane is `chbrdk/PLEXON` — do not deploy Coolify prod from this repo. This island targets federation contract `2026-05-plexon-federation-v3`.
6. No MUI and no `@msqdx/react` for new or migrated surfaces. Do not expand `lib/mui-shim.tsx` / the react bridge for new work — migrate the importing file instead.
