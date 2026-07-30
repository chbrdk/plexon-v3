# Platform Provisioning And Membership Sync

## Goal
Make `PLEXON` the control plane not only for product visibility and launch context, but also for the provisioning state behind each granted product. `PLEXON` should know whether a product grant is only desired, already applied locally, failed to sync, or needs operator attention.

`CHECKION` and `AUDION` must still remain authoritative for their own local authorization and membership rules.

## Current State

### PLEXON
- Central `users` identity exists in `lib/db/schema.ts`.
- Product access exists in `user_product_entitlements`.
- Admin writes currently happen through `app/api/admin/users/[id]/route.ts` and `app/api/admin/users/[id]/entitlements/route.ts`.
- Product registry is already user-aware via `app/api/platform/products/route.ts`.
- Existing service-contract building blocks already exist:
  - `lib/platform-contract.ts`
  - `lib/auth-request-user.ts`
  - `app/api/services/profile/route.ts`
  - `app/api/services/usage/events/route.ts`
- Existing outbound product integration is product-specific and uneven. `CHECKION` has an outbound client pattern; `AUDION` does not yet.

### CHECKION
- Central identity can come from `PLEXON`, but product authorization is local.
- A local project membership model now exists via `project_members`, with legacy fallback to `projects.userId` for pre-existing owner rows.
- Local `users` rows are optional for many product tables because foreign keys were intentionally relaxed for `PLEXON` user ids.
- Existing service-style anchor exists through admin key routes such as:
  - `app/api/admin/users/route.ts`
  - `app/api/admin/users/[id]/route.ts`
- Important limitation: deleting or changing a local user row is not a full revocation model in a `PLEXON`-backed deployment because JWT/API-token behavior is separate.

### AUDION
- Identity, profile sync, and usage reporting already federate with `PLEXON`.
- Effective authorization is fully local via:
  - local `users`
  - local `projects`
  - local `project_members`
- `plexon_user_id` already exists as a stable link key.
- Best extension path is an idempotent local user upsert keyed by `plexon_user_id`, followed by explicit local `ProjectMember` materialization.

## Design Principles
- `PLEXON` is authoritative for platform-level grant intent.
- Each product is authoritative for local access enforcement.
- Central provisioning state must describe sync intent and sync outcome, not pretend to replace product truth.
- Provisioning must be idempotent and retryable.
- Product sync must use stable user ids, not email as the primary key.
- Provisioning state should not be lost when entitlements are replaced or edited.

## Target Model

### 1. Separate provisioning state from entitlements
Do not overload `user_product_entitlements` with sync runtime state.

Add a new central table in `PLEXON`, for example `user_product_provisioning`, keyed by `userId + productId`.

Recommended first fields:
- `userId`
- `productId`
- `desiredState` (`granted`, `disabled`)
- `syncStatus` (`pending`, `in_sync`, `failed`, `disabled`, `not_supported`)
- `syncMessage`
- `lastAttemptAt`
- `lastSucceededAt`
- `lastSourceHash`
- `provisionedUserId` or `externalUserRef` (optional, for product-local mapping visibility)
- timestamps

This keeps the access decision (`entitlements`) separate from operational sync telemetry (`provisioning`).

### 2. Introduce explicit provisioning actions in PLEXON
When an entitlement changes, `PLEXON` should compute desired provisioning work:
- newly granted product -> schedule or execute `grant`
- disabled entitlement -> schedule or execute `disable`
- profile changes -> schedule `resync-profile`
- optional admin action -> `retry`

First version can be synchronous server-side fanout after admin writes, but the model should already support retries and failure state.

### 3. Standardize product provisioning contracts
Each product should expose a service-authenticated provisioning endpoint.

Recommended first contract:
- `PUT /api/platform/provisioning/users/[id]`
- authenticated via shared service secret and platform contract header

Suggested payload:
- central user identity:
  - `userId`
  - `email`
  - `name`
  - `company`
  - `avatarUrl`
  - `locale`
- platform grant intent:
  - `desiredState`
  - `platformRole`
  - `defaultContext`
- optional sync metadata:
  - `contractVersion`
  - `source`
  - `requestedAt`

Suggested response:
- `status` (`applied`, `no_change`, `disabled`, `failed`)
- `productUserId` or `localUserId`
- optional `details`

### 4. Product-local implementation rules

#### CHECKION
`CHECKION` now has a first explicit membership layer:
- local shadow-user provisioning remains the base step
- explicit `projectAssignments` can now materialize local `project_members`
- platform-managed memberships are tracked separately so resyncs only update those rows
- legacy owner fallback keeps old projects accessible while explicit memberships roll out

The current shared-project scope is still intentionally narrow:
- core project detail and summary reads now resolve through the project owner after membership access succeeds
- broader project-scoped writes should still be audited route by route

#### AUDION
`AUDION` already has a proper `project_members` model:
- ensure a local user exists and is linked by `plexon_user_id`
- keep local project membership authoritative
- only materialize memberships when explicitly mapped or when a later platform rule defines such mapping

First version should still stay narrow:
- upsert local user
- refresh local profile fields
- record provisioning success/failure
- keep project membership sync as an explicit next layer, not implicit side effect

## Recommended Phases

### Phase 1: PLEXON provisioning telemetry
- add central provisioning table + helper queries
- extend admin read model so entitlements and provisioning state are visible together
- add retry-friendly write path instead of destructive full replace semantics

### Phase 2: Product provisioning contracts
- define shared request/response contract
- add outbound product clients in `PLEXON`
- add inbound provisioning endpoints in `CHECKION` and `AUDION`

### Phase 3: Narrow product sync
- `CHECKION`: local shadow-user / status sync only
- `AUDION`: local user upsert and profile sync only

### Phase 4: Admin operations
- show per-product provisioning status in `PLEXON` admin
- add retry / resync controls
- expose last success / failure message

### Phase 5: Membership expansion
- only after the above is stable:
  - design real `CHECKION` membership model if needed
  - add explicit project/workspace mapping rules for `AUDION`

## Implemented Membership Expansion Slice

### Explicit `AUDION` project mappings
- `PLEXON` now stores explicit `AUDION` project mappings separately from both entitlements and provisioning telemetry.
- These mappings are manual by `AUDION` project id and role (`member` / `admin`).
- They are edited inside the existing `PLEXON` user admin flow alongside entitlement configuration.

### Local `AUDION` application
- `AUDION` provisioning now applies explicit mapped memberships into local `project_members`.
- `AUDION` also stores a local tracking table for platform-managed memberships so later resyncs can remove or update only platform-managed rows.
- Existing non-platform-managed memberships remain local truth and are not implicitly overwritten.

### Explicit `CHECKION` project mappings
- `PLEXON` now accepts explicit `CHECKION` project mappings alongside `AUDION`.
- `CHECKION` provisions those mappings into local `project_members` rows with `admin` / `member` roles.
- `CHECKION` stores platform-managed memberships separately so later resyncs only mutate the centrally managed subset.
- Existing projects without explicit owner memberships still work through legacy owner fallback on `projects.userId`.
- Shared-project start paths now also store new project-linked work owner-backed in `CHECKION`, so explicit mappings affect not only visibility but also new scans and rank-refresh executions.
- Shared-project detach flows for owner-backed resources now resolve through the current owner domain; cross-owner moves remain blocked by design.
- Shared-project read access in `CHECKION` now also extends into owner-backed GEO runs, Journey Agent runs, filtered domain-scan lists, and standalone scan detail reads where the underlying resource is project-linked.
- Shared-project search and share flows in `CHECKION` now also honor the owner-backed model, so accessible shared project resources can be discovered globally and shared publicly without assuming the viewer is the storage owner.
- The default standalone/domain/history list surfaces in `CHECKION` now also distinguish between absent and empty `projectId` filters, so "all accessible work" and "unassigned only" no longer collapse into the same behavior.

## Risks
- Current entitlement write path in `PLEXON` does full replace, which is a poor fit for sync diffing and status retention.
- `CHECKION` still needs selective follow-up on broader "all accessible work" list/history UX so collaborative resources show up only where the product really intends them to.
- `CHECKION` still has a legacy `GET /api/scans` surface, but it is now aligned for shared visibility while remaining separate from the preferred paginated dashboard list contract.
- Cross-owner resource moves in `CHECKION` are still intentionally unsupported and would need an explicit migration concept if ever required.
- `AUDION` has both `owner_user_id` and `project_members.role`, so owner sync semantics need care.
- Product-local disable semantics are not yet standardized.
- Central provisioning must not imply local authorization if the product has not actually applied the change.

## Recommended Next Implementation Block
1. Add `PLEXON` provisioning schema and helper queries.
2. Extend `PLEXON` admin entitlement reads with provisioning status.
3. Define a shared provisioning contract in `PLEXON`.
4. Add product provisioning endpoints:
   - `CHECKION`: user shadow/status sync
   - `AUDION`: local user upsert/profile sync
5. Add retryable fanout from `PLEXON` admin entitlement writes.

## Guardrails
- Keep `PLEXON` authoritative for grant intent, not for final local authz truth.
- Keep provisioning state separate from entitlement state.
- Prefer idempotent `PUT`-style sync APIs.
- Do not auto-create local project memberships unless the mapping rule is explicit.
- Treat provisioning failure as operational state, not as silent success.
