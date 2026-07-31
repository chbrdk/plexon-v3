# AGENTS.md — PLEXON v3

1. Specs first. Update `specs/domain` or `specs/api` before changing behavior. UI rebuild: `specs/domain/ui-migrate.md`.
2. **Rebuild, don’t skin.** Challenge keep/reshape/drop per wave. Prefer modern approaches and Audion/`@msqdx/ui` reuse over porting legacy chrome. See `knowledge/ui-rebuild-reuse.md`.
3. Shared UI primitives come from `@msqdx/ui`. Do not create app-local replacements when the primitive belongs in `msqdx-ui`. Reuse Audion composition patterns (especially chat) instead of inventing a second UI.
4. No hardcoded URLs, paths, or service bases. Use `lib/constants.ts` / `lib/shell-paths.ts` / `lib/runtime-env.ts` and document canonical values in `knowledge/paths.md`.
5. Tests with every change: UI smoke, contract checks, and build validation.
6. Prod control plane is `chbrdk/PLEXON` — do not deploy Coolify prod from this repo. This island targets federation contract `2026-05-plexon-federation-v3`.
7. No MUI and no `@msqdx/react` for new or rebuilt surfaces. Do not expand `lib/mui-shim.tsx` / the react bridge — rebuild the importing surface instead.
