# VIDEON federation API

**Status:** Proposed — 2026-09-04

**Contract version:** `2026-05-plexon-federation-v3`

**Domain spec:** `specs/domain/videon-integration.md`

## Scope

This contract connects PLEXON and `videon-v3`. It defines Collection provisioning, origin linking, accessible-Collection discovery, read-only summary, deep links, health, identity context, usage, and the internal vision boundary needed for interoperable tests.

It does not expose media binaries through PLEXON, define the full editor API, or allow PLEXON to reach directly into the VIDEON database.

## Common transport rules

- HTTPS outside local development.
- JSON uses `application/json; charset=utf-8`.
- Service calls include:
  - `X-Plexon-Contract-Version: 2026-05-plexon-federation-v3`
  - `X-Service-Secret: <secret>`
  - `X-Plexon-User-Id: <uuid>` whenever execution is on behalf of a user
- Mutating/job calls include `Idempotency-Key`; reusing a key with a different payload returns `409`.
- Request/correlation ids are accepted and returned as `X-Request-Id`.
- Unknown fields are tolerated on reads and rejected on strict write bodies unless the endpoint says otherwise.
- Contract mismatch returns `409 contract_version_mismatch`, not a silent partial success.
- Service authentication never substitutes for user authorization on user-scoped work.

### Error envelope

```json
{
  "error": {
    "code": "collection_access_denied",
    "message": "The user cannot access this Collection.",
    "retryable": false,
    "requestId": "req_...",
    "details": {}
  }
}
```

Expected status classes: `400`, `401`, `403`, `404`, `409`, `413`, `422`, `429`, `503`.

## PLEXON → VIDEON provisioning

### `PUT /api/platform/provisioning/projects/{platformProjectId}`

Creates or updates the sole VIDEON workspace mirror for a Collection.

```json
{
  "platformProjectId": "uuid",
  "platformCompanyId": "uuid",
  "ownerPlexonUserId": "uuid",
  "members": [
    { "plexonUserId": "uuid", "role": "admin" },
    { "plexonUserId": "uuid", "role": "member" }
  ],
  "name": "Launch Campaign",
  "domain": "example.com",
  "status": "active"
}
```

Rules:

- Path and body `platformProjectId` must match.
- Upsert uniqueness is `platformProjectId`.
- `members` is the authoritative, deduplicated projection of explicit Collection grants.
  The owner is always projected as `admin`; product-local membership not present in this
  payload is removed. `role` is either `admin` or `member`.
- Replays produce the same workspace and do not duplicate membership or jobs.
- `archived` makes the workspace read-only for new upload, analysis, Cut, and export operations.
- Renames/domain changes update the projection without rewriting product-local history.
- Successful create returns `201`; successful update/replay returns `200`.

```json
{
  "project": {
    "id": "videon-workspace-uuid",
    "platformProjectId": "uuid",
    "platformCompanyId": "uuid",
    "ownerPlexonUserId": "uuid",
    "members": [
      { "plexonUserId": "uuid", "role": "admin" },
      { "plexonUserId": "uuid", "role": "member" }
    ],
    "name": "Launch Campaign",
    "domain": "example.com",
    "status": "active"
  },
  "created": true,
  "contractVersion": "2026-05-plexon-federation-v3"
}
```

PLEXON stores `project.id` as the binding `external_project_id`.

### `GET /api/platform/provisioning/projects/{platformProjectId}`

Returns a bounded dashboard projection. It must not return transcripts, frame URLs, provider payloads, or user PII.

```json
{
  "project": {
    "id": "videon-workspace-uuid",
    "platformProjectId": "uuid",
    "name": "Launch Campaign",
    "status": "active"
  },
  "summary": {
    "mediaCount": 12,
    "readyMediaCount": 10,
    "processingMediaCount": 1,
    "failedMediaCount": 1,
    "cutCount": 3,
    "lastActivityAt": "2026-09-04T10:00:00.000Z"
  },
  "links": {
    "home": "/library?platformProjectId=uuid",
    "upload": "/upload?platformProjectId=uuid"
  },
  "contractVersion": "2026-05-plexon-federation-v3"
}
```

Links are same-product relative paths. PLEXON resolves them against registry configuration; VIDEON must not return a hardcoded public base URL.

## VIDEON → PLEXON origin

### `POST /api/platform/provisioning/videon-project-origin`

Used only when a flow begins inside VIDEON and no Collection is selected. PLEXON creates or resolves the Collection, binds the origin workspace, and triggers the existing sibling-mirror sync path.

```json
{
  "videonWorkspaceId": "uuid",
  "name": "Launch Campaign",
  "domain": "example.com",
  "platformCompanyId": "uuid",
  "ownerPlexonUserId": "uuid"
}
```

Response:

```json
{
  "platformProjectId": "uuid",
  "binding": {
    "productId": "videon",
    "externalProjectId": "uuid",
    "syncStatus": "in_sync"
  },
  "siblingSync": {
    "accepted": true
  }
}
```

The caller must validate that the user can create a Collection in the target company. The origin route is not a generic account-provisioning endpoint.

## Collection discovery and repair

VIDEON consumes existing PLEXON endpoints:

- `GET /api/platform/provisioning/accessible-collections` with `X-Plexon-User-Id`
- `POST /api/platform/provisioning/sync-capability-mirrors` with optional `{ "productIds": ["videon"] }`
- `POST /api/platform/provisioning/projects/{platformProjectId}/sync`

The product does not create a second Collection directory. The accessible list is bounded by PLEXON and follows access model B.

## Identity

VIDEON adopts the canonical PLEXON federation identity/profile flow documented in `knowledge/platform-federation-contract.md`. At minimum, the local session projection contains:

- Plexon user id
- company/tenant id
- global and company roles
- locale/profile values needed by the UI
- session/validation timestamps

Local authorization still evaluates workspace/resource scope. A valid PLEXON identity without Collection assignment is insufficient.

### Access projection

`videon_workspace_members` is the durable local projection for Access Model B. PLEXON
provisions it with every workspace upsert and replays it after a Collection-membership
change. VIDEON accepts a user only when they are the workspace owner or have a projected
member row; it must not treat company membership as a Collection grant. Until a successful
projection exists, the owner remains the sole allowed user (fail closed).

## Health

### `GET /api/health`

Public liveness only:

```json
{ "status": "ok", "service": "videon" }
```

It must not reveal dependencies, paths, versions, secrets, queue sizes, or provider configuration.

### `GET /api/federation/health`

Service-authenticated readiness:

```json
{
  "status": "ready",
  "service": "videon",
  "contractVersion": "2026-05-plexon-federation-v3",
  "capabilities": {
    "provisioning": true,
    "summary": true,
    "vision": true
  },
  "dependencies": {
    "database": "ready",
    "queue": "ready",
    "objectStorage": "ready",
    "openrouterPreflight": "ready"
  }
}
```

Dependency values are coarse and safe. A stale/failed model preflight makes `vision` false but need not make the read-only library unavailable.

## Stable deep links

| Purpose | Relative route |
|---|---|
| Workspace library | `/library?platformProjectId={platformProjectId}` |
| Upload | `/upload?platformProjectId={platformProjectId}` |
| Media detail | `/media/{mediaAssetId}?platformProjectId={platformProjectId}` |
| Scene | `/media/{mediaAssetId}?platformProjectId={platformProjectId}&scene={sceneId}` |
| Cut editor | `/cuts/{cutId}?platformProjectId={platformProjectId}` |
| Analysis run | `/media/{mediaAssetId}/analysis/{analysisRunId}?platformProjectId={platformProjectId}` |
| Export | `/cuts/{cutId}/exports/{exportId}?platformProjectId={platformProjectId}` |

IDs are opaque and URL-encoded. VIDEON verifies that every requested entity belongs to the provided accessible Collection; the query parameter is context, not authorization.

## Capability execution shape

All capability endpoints are service-authenticated and user-authorized. They return bounded JSON.

### Job acceptance

```json
{
  "job": {
    "id": "uuid",
    "capabilityId": "videon.analysis.run",
    "status": "queued",
    "platformProjectId": "uuid",
    "statusUrl": "/api/platform/capabilities/jobs/uuid",
    "resultUrl": null
  }
}
```

### Job status

```json
{
  "job": {
    "id": "uuid",
    "status": "queued|running|succeeded|failed|cancelled",
    "progress": { "completed": 3, "total": 8 },
    "result": null,
    "error": null,
    "updatedAt": "2026-09-04T10:00:00.000Z"
  }
}
```

Polling uses backoff and `Retry-After`; a future event transport may be added without changing the job resource.

## Usage ingestion

For OpenRouter calls, VIDEON posts the existing PLEXON usage shape with `service: "videon"`, event type `llm_request`, and a deterministic idempotency key derived from the provider request/run-stage identity.

Required metadata:

```json
{
  "analysisRunId": "uuid",
  "stageRunId": "uuid",
  "mediaAssetId": "uuid",
  "model": "qwen/qwen3.7-flash",
  "provider": "effective-provider",
  "promptTokens": 0,
  "completionTokens": 0,
  "reasoningTokens": 0,
  "cachedTokens": 0,
  "providerCostUsd": "0.000000",
  "openRouterRequestId": "opaque"
}
```

PLEXON identifiers must not be sent as provider-visible metadata beyond the approved pseudonymous user key. New compute/storage/export event names are forbidden until `lib/usage-conversion.ts` and the billing spec define their units and conversion; unknown-event fallback is not a pricing strategy.

## Internal OpenRouter adapter contract

This is an internal seam, not a public browser endpoint. Its executable schema and fixtures live in VIDEON.

### Input

```json
{
  "schemaVersion": "videon.scene-analysis-request.v1",
  "analysisRunId": "uuid",
  "sceneId": "uuid",
  "locale": "de",
  "timeRange": { "startMs": 0, "endMs": 5000 },
  "context": { "transcriptExcerpt": "bounded text", "assetHints": ["bounded hint"] },
  "frames": [
    { "id": "frame-1", "timestampMs": 500, "mimeType": "image/jpeg", "bytes": "internal-reference" }
  ]
}
```

The default gateway path converts frames to OpenRouter image parts in timestamp order. Prompt text precedes image parts. Private storage URLs never leave the service; binary derivatives are read server-side and encoded or sent through an explicitly approved provider-accessible mechanism.

An optional `inputMode: "video"` request variant may carry a bounded internal media/clip reference. The gateway transcodes and submits it as a private base64 video input only when the model, provider, privacy, size, and budget policy all permit it. A direct public or long-lived signed asset URL is invalid.

### Output

```json
{
  "insight": { "schemaVersion": "videon.scene-insight.v2" },
  "provenance": {
    "requestedModel": "string",
    "actualModel": "string",
    "provider": "string",
    "requestId": "string",
    "promptVersion": "videon.scene-analysis-prompt.v2",
    "schemaVersion": "videon.scene-insight.v2",
    "usage": {
      "promptTokens": 0,
      "completionTokens": 0,
      "reasoningTokens": 0,
      "cachedTokens": 0,
      "costUsd": "0.000000"
    }
  }
}
```

OpenRouter request policy requires data-collection denial and environment-selected provider/ZDR constraints. Qwen3.7 Flash uses JSON output plus local executable-schema validation; the Qwen3-VL 30B fallback uses strict JSON Schema and parameter-support enforcement. Schema-invalid output is never stored as a successful insight.

## Conformance scenarios

Both repositories must share fixtures for:

1. create, replay, rename, archive, and restore provisioning;
2. contract mismatch, invalid service secret, missing user context, and inaccessible Collection;
3. origin creation plus sibling-sync acceptance;
4. bounded summary and relative link validation;
5. deep-link entity/Collection mismatch denial;
6. duplicate job idempotency and conflicting replay;
7. queue restart and terminal job polling;
8. OpenRouter success, schema failure, rate limit, provider timeout, no eligible privacy route, and cost capture;
9. duplicate usage ingestion;
10. health degradation where vision is unavailable but the read-only library remains reachable.
