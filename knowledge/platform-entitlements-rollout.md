# Platform Entitlements Rollout

## Scope
- `PLEXON` is now the admin-managed source of truth for per-user product access.
- Product registry responses from `GET /api/platform/products` are user-aware and include access + launch context.
- `AUDION` and `CHECKION` consume launch context only as a defaulting signal. Local product authorization stays authoritative.

## Central APIs
- `GET /api/admin/users/[id]/entitlements`
- `PUT /api/admin/users/[id]/entitlements`
- `GET /api/platform/products`

## Contract Version
- Federation contract version: `2026-05-plexon-federation-v2`
- Reason for bump: `/api/platform/products` now returns viewer-aware access and launch context instead of a purely static registry payload.

## Launch Payload
Current launch payload is intentionally compact and query-param based:

- `plexon_source=plexon`
- `plexon_return_to=<PLEXON URL>`
- `plexon_entry_point=<entryPointId>`
- `plexon_platform_role=<member|manager|admin>`
- `projectId=<local product project id>`

`PLEXON` may additionally resolve a same-origin `deepLink` before these params are appended.

## Local Consumer Rules
### CHECKION
- Reads `projectId` from the launch URL and preselects it on the scan surface only when the project exists locally.
- Login/redirect preservation continues to flow through the existing `redirect` handling.
- All API writes and reads continue to validate the project against local CHECKION ownership and membership.

### AUDION
- Resolves the preferred active project in this order: launch context, current selection, cookie, backend default.
- A project from launch context is only adopted when it exists in the locally fetched project list.
- The selected project is persisted locally after validation; backend/API authorization remains unchanged.

## Focused Test Gates
- `PLEXON`
  - registry access resolution (`__tests__/platform-products.test.ts`)
  - launch link composition (`__tests__/federation-links.test.ts`)
  - admin entitlement routes (`__tests__/admin-user-entitlements-route.test.ts`)
  - product registry API contract (`__tests__/platform-products-api-route.test.ts`)
- `CHECKION`
  - launch-project selection (`__tests__/lib/launch-project.test.ts`)
  - runtime metadata contract version (`__tests__/lib/runtime-metadata.test.ts`)
- `AUDION`
  - preferred-project selection (`apps/web/lib/project-selection.test.ts`)
  - runtime metadata contract version (`apps/web/lib/runtime-metadata.test.ts`)

## Rollout Order
1. Deploy `PLEXON` with the new entitlement schema, admin API, registry response, and admin UI.
2. Confirm `/api/platform/products` returns `access` + `launchContext` for an authenticated user.
3. Add or update explicit entitlements for a test user in `PLEXON`.
4. Verify `AUDION` project defaulting with a federated launch that includes `projectId`.
5. Verify `CHECKION` scan preselection with a federated launch that includes `projectId`.
6. Promote to broader users only after the live checks above pass on production URLs.

## Operational Notes
- Existing core products (`CHECKION`, `AUDION`) still have safe default visibility until an explicit entitlement override exists.
- Future products (`VIDEON`, `BRANDION`) stay hidden by default until explicitly granted.
- `PLEXON` admins always retain visibility across products so they can manage access without locking themselves out.
