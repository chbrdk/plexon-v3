# Federation Production Verification

Last updated: 2026-05-12

## Live URLs

- `https://plexon.projects-a.plygrnd.tech`
- `https://checkion.projects-a.plygrnd.tech`
- `https://audion.projects-a.plygrnd.tech`

## Public smoke checks

Validated on 2026-05-12:

- `GET https://plexon.projects-a.plygrnd.tech/api/health` -> `200`
- `GET https://checkion.projects-a.plygrnd.tech/api/health` -> `200`
- `GET https://audion.projects-a.plygrnd.tech/api/health` -> `200`
- `GET https://plexon.projects-a.plygrnd.tech/login` -> `200`
- `GET https://checkion.projects-a.plygrnd.tech/login` -> `200`
- `GET https://audion.projects-a.plygrnd.tech/login` -> `200`
- `GET https://checkion.projects-a.plygrnd.tech/settings?plexon_source=plexon&plexon_return_to=https%3A%2F%2Fplexon.projects-a.plygrnd.tech%2Fproducts` -> `200`
- `GET https://audion.projects-a.plygrnd.tech/admin?plexon_source=plexon&plexon_return_to=https%3A%2F%2Fplexon.projects-a.plygrnd.tech%2Fproducts` -> `200`
- `GET https://plexon.projects-a.plygrnd.tech/api/platform/products` (without auth) -> `401`
- `GET https://plexon.projects-a.plygrnd.tech/api/services/checkion/users` (without auth) -> `403`

These checks prove that the deployed web surfaces and basic health endpoints are reachable without authentication.

## Runtime metadata

The Next.js health endpoints in `PLEXON`, `CHECKION`, and `AUDION` should expose lightweight runtime metadata in addition to `status`:

- `app`
- `runtime`
- `version`
- `nodeEnv`
- `federationContractVersion`
- `deployment.commitSha`
- `deployment.branch`
- `deployment.buildId`
- `deployment.builtAt`

This keeps health checks backwards-compatible while making it much easier to verify whether a live deployment already serves the expected build.

## Federation assumptions

- `PLEXON` is the system of record for central auth, profile, usage, and product registry.
- Product entry points should originate from `PLEXON` and include:
  - `plexon_source=plexon`
  - `plexon_return_to=<current plexon url>`
- `CHECKION` and `AUDION` must only honor `plexon_return_to` values that match the configured `NEXT_PUBLIC_PLEXON_REGISTER_URL` origin.
- If `NEXT_PUBLIC_PLEXON_REGISTER_URL` is missing in a product deployment, the safe fallback is to suppress the return link instead of accepting arbitrary origins.

## Required env review

Minimum env assumptions for production federation:

- `PLEXON`
  - `NEXT_PUBLIC_CHECKION_URL`
  - `NEXT_PUBLIC_AUDION_ADMIN_URL`
  - optional future products:
    - `NEXT_PUBLIC_VIDEON_URL`
    - `NEXT_PUBLIC_BRANDION_URL`
- `CHECKION`
  - `NEXT_PUBLIC_PLEXON_REGISTER_URL`
  - `PLEXON_AUTH_URL`
  - `PLEXON_SERVICE_SECRET`
- `AUDION`
  - `NEXT_PUBLIC_PLEXON_REGISTER_URL`
  - `PLEXON_AUTH_URL`
  - `PLEXON_SERVICE_SECRET`

## Remaining gaps

- Authenticated end-to-end smoke checks still require a dedicated test account or session bootstrap.
- After each deployment, verify at least one real flow:
  1. Open a product from `PLEXON`.
  2. Confirm the product login or shell shows the "Back to PLEXON" action.
  3. Confirm the action returns to the original `PLEXON` surface.
