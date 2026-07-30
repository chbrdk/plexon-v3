# Platform Provisioning Rollout

## Scope
- `PLEXON` now stores provisioning telemetry separately from entitlements in `user_product_provisioning`.
- `PLEXON` stores explicit `AUDION` and `CHECKION` project mappings separately in `user_product_project_assignments`.
- Admin writes in `PLEXON` now trigger synchronous product fanout after user profile or entitlement changes.
- `CHECKION` and `AUDION` now expose `PUT /api/platform/provisioning/users/[id]` for idempotent service-authenticated sync.

## Central Model

### Table
`PLEXON/lib/db/schema.ts`

New table: `user_product_provisioning`

Fields:
- `userId`
- `productId`
- `desiredState`
- `syncStatus`
- `syncMessage`
- `lastAttemptAt`
- `lastSucceededAt`
- `lastSourceHash`
- `externalUserRef`
- timestamps

Additional table: `user_product_project_assignments`

Fields:
- `userId`
- `productId`
- `externalProjectId`
- `role`
- timestamps

### Status semantics
- `pending`: expected sync work exists, but no successful sync is recorded yet
- `in_sync`: product acknowledged the current desired state
- `failed`: last sync attempt failed
- `disabled`: desired state is disabled and product accepted the disable request
- `not_supported`: no provisioning client exists for that product yet

## Central Write Path

### Entitlements
`PLEXON/app/api/admin/users/[id]/entitlements/route.ts`

- Entitlement updates keep row identity where possible instead of destructive delete+reinsert for every product.
- After saving entitlements, `PLEXON` calls `syncUserProductProvisioning(..., { force: true })`.
- Response items now include provisioning summary data for the edited products.
- `AUDION` and `CHECKION` entitlement items can now also carry explicit `projectAssignments`.

### User profile updates
`PLEXON/app/api/admin/users/[id]/route.ts`

- After admin profile updates, `PLEXON` re-fans out provisioning so downstream shadow users receive profile changes.

### Manual admin actions
`PLEXON/app/api/admin/users/[id]/provisioning/route.ts`

- Supports `POST` with `mode: retry | resync`
- Can target selected `productIds`
- Forces product fanout even when the last source hash already matches
- Returns fresh provisioning telemetry for the affected products

## Shared Provisioning Contract

### Request
`PUT /api/platform/provisioning/users/[id]`

Headers:
- `X-Service-Secret: <PLEXON_SERVICE_SECRET>`
- `X-Plexon-Contract-Version: 2026-05-plexon-federation-v2`

Body:
- `userId`
- `email`
- `name`
- `company`
- `avatarUrl`
- `locale`
- `desiredState`
- `platformRole`
- `defaultContext`
- `projectAssignments`
- `contractVersion`
- `source`
- `requestedAt`

### Response
- `status`: `applied | no_change | disabled | failed`
- `externalUserRef`
- `details`

## Product Behavior

### CHECKION
- Upserts a local shadow user by `id === plexon user id`
- Syncs profile fields on granted state
- Revokes local API tokens on disabled state
- Materializes explicit platform-managed project memberships into local `project_members`
- Tracks those synced memberships locally so resyncs only touch platform-managed rows
- Keeps legacy owner fallback via `projects.userId` so existing projects remain accessible during rollout
- Returns product-local status without claiming global authorization enforcement

### AUDION
- Upserts local user by `plexon_user_id`, with email fallback for first link
- Syncs profile fields on granted state
- Revokes local API tokens on disabled state
- Materializes explicit platform-managed memberships into `project_members`
- Tracks those synced memberships locally so later resyncs only touch platform-managed rows
- Keeps non-platform-managed memberships authoritative and untouched

## Env Requirements

### PLEXON
- `PLEXON_SERVICE_SECRET`
- `CHECKION_API_URL` or `NEXT_PUBLIC_CHECKION_URL`
- `AUDION_API_URL` or `NEXT_PUBLIC_AUDION_ADMIN_URL`

### CHECKION
- `PLEXON_SERVICE_SECRET`

### AUDION API
- `PLEXON_SERVICE_SECRET`

## Verified Gates
- `PLEXON`: `npx vitest run __tests__/admin-user-entitlements-route.test.ts`
- `PLEXON`: `npx vitest run __tests__/admin-user-provisioning-route.test.ts`
- `PLEXON`: `npm run build`
- `CHECKION`: `npx vitest run __tests__/api/platform-provisioning-route.test.ts`
- `CHECKION`: `npx vitest run __tests__/api/projects-id-membership-read.test.ts __tests__/api/projects-id-patch-tags-sync.test.ts`
- `CHECKION`: `npm run build`
- `AUDION API`: `python3 -m py_compile app/core/plexon_contract.py app/routers/platform_provisioning.py app/main.py tests/test_platform_provisioning_route.py`
- `AUDION API`: `python3 -m py_compile app/models/__init__.py app/routers/platform_provisioning.py tests/test_platform_provisioning_route.py alembic/versions/20260512_platform_managed_project_memberships.py`

## Notes
- `AUDION` route execution test could not be run locally in this workspace because the available `python3` environment does not include `fastapi`; syntax validation passed.
- `VIDEON` and `BRANDION` currently surface as `not_supported` until product endpoints are added.
- `PLEXON` admin now exposes per-product `Retry` and `Resync` controls in the user edit modal.
- `PLEXON` admin now also exposes explicit `AUDION` and `CHECKION` project mappings by local project id and role.
