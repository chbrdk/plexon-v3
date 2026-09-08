# VIDEON as a Collection capability

**Status:** Proposed — 2026-09-04

**Decision target:** architecture and delivery contract for `videon-v3`

**Federation:** `2026-05-plexon-federation-v3`

**Evidence baseline:** `chbrdk/videon` at `445d42ea353d6cfd1ccab05f0adf0ced5b07e060` (`master`)

**Companions:** `specs/api/videon-federation.md` · `knowledge/videon-integration-evaluation.md` · `specs/domain/collection-projects.md`

## Decision

VIDEON joins PLEXON as a **Collection-bound capability**, never as another user-facing project type.

The target is a clean `videon-v3` island that reuses the proven domain behavior from `chbrdk/videon`, but adopts the current ecosystem shell, contracts, security model, job semantics, and shared UI. This is a rebuild, not a visual skin over the legacy application.

The production vision path moves from local MLX/Ollama Qwen-VL services to an OpenRouter gateway using current Qwen multimodal models. The default cost lane is Qwen3.7 Flash. Local media preprocessing remains in VIDEON workers; the normal evidence path sends bounded, ordered still frames plus timestamps and context. Direct video input is an optional benchmarked lane, not the default.

These decisions are locked for implementation unless a later accepted spec changes them:

1. PLEXON owns Collections, identity, access truth, registry, usage ingestion, cross-product orchestration, and read-only summaries.
2. VIDEON owns media, cuts, analyses, transcripts, exports, storage adapters, and its product UX.
3. The legacy entity named `Project` is renamed in the v3 domain to **Cut** (or `EditComposition` internally). It must not compete with a PLEXON Collection.
4. All VIDEON work is scoped by `platformProjectId`; collection-less production assets are invalid.
5. Production visual inference uses OpenRouter with `qwen/qwen3.7-flash` as the default cost lane and a schema-enforcing fallback lane. MLX and Ollama are transitional development/shadow adapters only and are removed after the cutover gate.
6. The AI gateway returns versioned structured data with provenance and usage. Formatted prose is a projection, never the source of truth.
7. Long-running work runs in a durable queue with persisted stages, retries, cancellation, idempotency, and restart recovery.
8. Every new or rebuilt user-facing surface uses the sibling v3 stack and `@msqdx/ui`. Missing reusable primitives are added upstream to `msqdx-ui`, not implemented as VIDEON-local substitutes. The implementation does not port the Svelte/Tailwind design system or add MUI/`@msqdx/react`.

## Why a new v3 island

The source repository contains substantial reusable product knowledge: upload and library flows, scene detection, keyframes, speech transcription, search, saliency/reframing, stem separation, timeline editing, and NLE exports. Its current runtime, however, has incompatible identity and project semantics, an Apple-Silicon-only inference service, ephemeral background orchestration, and production-blocking security gaps. Incrementally exposing that runtime to PLEXON would preserve the wrong boundaries.

`videon-v3` therefore treats the current codebase as a reference implementation and migration source. Algorithms, FFmpeg recipes, schemas, fixtures, and export logic may be extracted after review; shell, auth, queueing, tenancy, persistence, and AI integration are rebuilt against this spec.

## Goals

- Attach every VIDEON workspace to exactly one accessible PLEXON Collection.
- Provide a dependable media pipeline from upload through analysis, search, edit, and export.
- Make visual understanding portable across OpenRouter models/providers while validating every output against VIDEON-owned schemas.
- Surface useful VIDEON state in the Collection dashboard and Central Assistant without moving the editor into PLEXON.
- Enable future Collection Flows to invoke bounded VIDEON capabilities through the shared capability catalog.
- Preserve traceability from every generated insight to source asset, time range, sampled frames, prompt/schema version, model, provider, and cost.
- Establish a staged migration with measurable gates and a safe rollback path.

## Non-goals

- Hosting the video editor, player, waveform, or frame browser inside PLEXON.
- Sending complete raw video files to an LLM provider by default. A bounded direct-video lane may be enabled only after privacy, size, cost, and quality gates.
- Reproducing every legacy feature in the first release.
- Migrating anonymous or ownerless legacy data automatically.
- Treating OpenRouter as a job queue, asset store, or durable audit store.
- Adding VIDEON-specific primitives to PLEXON when they belong in `@msqdx/ui` or the VIDEON domain.
- Deploying PLEXON production from this repository; the production control plane remains `chbrdk/PLEXON`.

## Product language and identity

| Concept | User-facing term | Canonical identity |
|---|---|---|
| PLEXON work container | Collection / Projekt | `platformProjectId` |
| VIDEON mirror | VIDEON workspace | `videonWorkspaceId`, unique by `platformProjectId` |
| Uploaded source | Media | `mediaAssetId` |
| Legacy `Project` timeline | Cut | `cutId` |
| Pipeline execution | Analysis run | `analysisRunId` |
| Temporal unit | Scene | `sceneId`, with start/end time |

Copy must say “VIDEON in diesem Projekt” or “Medien in dieser Collection”, never “VIDEON-Projekt” as a project type.

## Target architecture

```text
PLEXON control plane
  Collection + access + registry + usage + Assistant/Flows
        | federation v3 (service auth + user context)
        v
VIDEON v3 web/BFF
  Collection picker · library · analysis · search · cuts · exports
        | signed upload / domain API
        v
VIDEON API + PostgreSQL ---- object storage
        |
        | transactional outbox / durable jobs
        v
VIDEON workers
  probe -> scenes -> frames -> audio/transcript -> vision -> index -> ready
                               |
                               | bounded JPEG/WebP frames + text/schema
                               v
                    OpenRouter -> Qwen3.7 Flash / approved fallback
```

### Ownership

| Concern | Source of truth |
|---|---|
| Collection lifecycle, membership, role | PLEXON |
| Product mirror and sync status | PLEXON binding + VIDEON workspace projection |
| Asset binary and derivatives | VIDEON object storage |
| Media metadata, scenes, transcript, analysis | VIDEON PostgreSQL |
| Cuts, shares, exports | VIDEON |
| Cross-product capability definitions | PLEXON capability catalog |
| Invocation/job state | Product owns execution; PLEXON stores orchestration references |
| LLM usage ledger | PLEXON ingestion; VIDEON retains per-run provider facts |
| Shared Collection knowledge | PLEXON Knowledge Pack; VIDEON may publish distillates only |

## Keep / reshape / drop

| Legacy capability | Decision | v3 treatment |
|---|---|---|
| Upload, library, folders | Reshape | Direct-to-object-store multipart upload; Collection-scoped library and tags. Folders are optional presentation, not authorization boundaries. |
| FFprobe/FFmpeg metadata | Keep | Extract tested worker modules and fixtures. |
| Scene detection/keyframes | Keep + reshape | Persist stage state and deterministic parameters; support adaptive multi-frame sampling. |
| Whisper transcription | Reshape | Worker adapter with language/model provenance; implementation selected independently of vision. |
| Qwen-VL descriptions | Rebuild | OpenRouter gateway, Qwen3.7 Flash default, application-validated versioned JSON, schema-enforcing fallback, privacy routing, cost capture. |
| Search indexing | Reshape | Index structured scene insights and transcripts; tenant/Collection filters are mandatory. |
| Saliency/reframing | Keep later | Worker capability after core pipeline reliability. |
| Audio stem separation | Keep later | Isolated optional job class with resource quotas. |
| Timeline editor and NLE export | Reshape | Rename legacy Project to Cut; port behavior after Collection/library foundation. |
| Public shares | Reshape later | Signed, revocable, expiry-aware share records; never leak Collection membership. |
| Svelte shell/custom design system | Drop | Rebuild with the v3 React/Next shell and `@msqdx/ui`. |
| MLX Qwen service / Swift Vision production services | Drop | OpenRouter for production vision; local utilities may exist only during migration and are deleted after gate V4. |
| `setTimeout`/polling background jobs | Drop | Durable queue and persisted workflow stages. |
| Docker-control HTTP endpoints | Drop | Operations stay outside the product API. |

## Runtime baseline

The implementation wave must record exact versions in the new repository ADR. The baseline is:

- Node.js 24 LTS for new services; Node 22 LTS is an acceptable temporary compatibility floor.
- Next.js 16.x on a current security patch, React 19, TypeScript strict mode, and the same auth/shell conventions as the v3 siblings.
- PostgreSQL with reviewed, versioned migrations. No schema push and no destructive flag during application startup.
- A Redis-compatible durable queue or PostgreSQL-backed job system selected by ADR and tested for restart recovery. The selection must support unique/idempotent jobs, retries with backoff, concurrency limits, cancellation, and dead-letter inspection.
- S3-compatible object storage behind an adapter; local filesystem storage is development-only.
- Python workers remain appropriate for PySceneDetect, Whisper, OpenCV, and audio tooling, but communicate through versioned jobs/events rather than ad-hoc internal HTTP and polling.

Align framework/library versions with the v3 sibling repositories at implementation time; do not couple federation delivery to an unrelated full ORM upgrade.

## Collection federation

The normative wire contract is `specs/api/videon-federation.md`.

### Required behavior

- PLEXON creates a `videon` binding placeholder and upserts `PUT /api/platform/provisioning/projects/{platformProjectId}`.
- VIDEON creates or updates one workspace identified by `platformProjectId`; repeated upserts are idempotent.
- VIDEON-first entry resolves an existing accessible Collection or creates one through the `videon-project-origin` route, then synchronizes sibling mirrors through the existing central path.
- Archive makes the workspace read-only and prevents new jobs; restore re-enables it. Hard-delete remains PLEXON-only and does not remotely delete media in the first wave.
- Access is model B: creator or explicit assignment, with global-admin override. Company membership alone is insufficient.
- A product picker reads PLEXON’s accessible-Collections endpoint; it does not maintain a second catalog.
- Product API requests validate a PLEXON session or service/user context and enforce the same Collection access locally.

### PLEXON integration changes

These changes occur only after V0 contract acceptance:

1. Add `videon` to mirror product types, placeholder creation, single/bulk sync allowlists, product upsert, lifecycle propagation, and binding queries.
2. Add `VIDEON_API_URL` resolution beside the existing public `NEXT_PUBLIC_VIDEON_URL`; document both in `knowledge/paths.md` and deployment guidance.
3. Add `POST /api/platform/provisioning/videon-project-origin` and contract tests.
4. Extend the Collection dashboard BFF and capability card with a read-only VIDEON summary and stable launch links.
5. Extend Assistant embed/page context and platform navigation only when the VIDEON v3 routes exist.
6. Register VIDEON catalog capabilities only when their product endpoints pass contract tests.

The existing registry, entitlement, public URL, and generic usage-service recognition are useful seeds but do not constitute completed integration.

## VIDEON domain model

The physical schema may vary, but these constraints are normative.

### `videon_workspaces`

- `id`
- `platform_project_id` — unique, required
- `platform_company_id` — required
- `owner_plexon_user_id` — required
- `name`, `domain`, `status`
- `federation_contract_version`
- timestamps

### `videon_workspace_members`

- `workspace_id`, `plexon_user_id`, `role` (`admin` | `member`)
- authoritative projection of PLEXON explicit Collection assignments; owner is always an admin
- update atomically with workspace provisioning; removal from the PLEXON payload revokes local access
- no company-wide or implicit product membership grants

### `media_assets`

- `id`, `workspace_id`, creator Plexon user id
- storage key, original filename, MIME, bytes, checksum
- duration, dimensions, frame rate, audio/video codec metadata
- lifecycle state (`uploading`, `uploaded`, `processing`, `ready`, `failed`, `archived`)
- source and retention metadata

Uniqueness on `(workspace_id, checksum)` may be used for explicit deduplication, but never silently aliases assets across Collections.

### `analysis_runs` and `analysis_stage_runs`

- run id, media id, pipeline/schema version, requested capabilities, status
- idempotency key and input fingerprint
- stage status, attempt, worker lease, started/finished timestamps, error class/code
- cancellation request, retry eligibility, progress numerator/denominator
- model/provider route, prompt/schema versions, token counts, provider cost, request id

There is at most one active run for the same media, pipeline version, and requested capability set unless the caller explicitly requests a rerun.

### `scenes` and `scene_insights`

- stable temporal boundaries and representative derivative references
- ordered sampled frame references with timestamps
- versioned JSONB insight payload
- confidence/evidence links where available
- search text/vector projection derived from the structured payload

Do not persist a stringified JSON blob as the canonical analysis.

### `cuts`

- workspace id, name, dimensions/rate, status, creator
- ordered `cut_scenes` referencing media/time ranges and transformations
- exports as separate durable jobs

Migration from legacy `Project` rows requires an explicit mapping report and must reject ambiguous or ownerless data for manual resolution.

## Durable media pipeline

### Stage graph

1. **ingest:** finalize multipart upload, verify checksum/MIME, quarantine until validation.
2. **probe:** obtain duration, streams, dimensions, rate, rotation, and codec facts.
3. **scene-detect:** calculate temporal scenes with versioned thresholds.
4. **frame-sample:** create bounded derivatives and timestamps per scene.
5. **audio:** extract audio; transcription and optional stems are independent retryable branches.
6. **vision:** analyze scenes using ordered multi-image requests into `videon.scene-insight.v2`.
7. **brand_compliance:** optional Brandion guideline check against evidence frames + `brandCandidates` (soft-skip until Brandion contract is live).
8. **aggregate:** produce asset-level summary from scene facts without re-sending all pixels.
9. **index:** commit transcript and structured insights with Collection filters.
10. **ready:** atomically expose the completed analysis projection.

Every stage is idempotent, records its input fingerprint, and may be resumed after a worker restart. A failed optional branch must not erase successful core results. Status is queryable; clients never keep a request open for pipeline completion.

### V3 infrastructure baseline

- Object storage uses an S3-compatible adapter and short-lived, workspace-scoped signed URLs.
  Endpoint, region, bucket, and credentials are runtime configuration; no bucket name or
  provider URL is embedded in source or returned by PLEXON.
- Durable work uses the shared Postgres deployment through `pg-boss`. Queue state and the
  media/analysis transaction are persisted; workers are a separate process and may be
  restarted safely. A missing storage or queue configuration returns a bounded `503` rather
  than falling back to process memory.

### Sampling policy

- Sample frames locally after scene detection; never rely on a provider to fetch private object-store URLs.
- Use representative start/middle/end or change-aware samples for long/complex scenes, with explicit timestamps and stable ordering.
- Bound per-scene frame count, image dimensions, encoded bytes, and total request size through versioned policy configuration.
- Put textual instructions and scene/time metadata before image parts.
- Redact metadata and overlays where policy demands it; never put emails or customer names into the OpenRouter `user` field.
- Aggregate hierarchically: scene facts first, then asset summary from facts/transcript. This controls token cost and avoids repeatedly sending the same pixels.

The exact sampling limits are benchmark outputs, not guessed constants. V4 cannot launch until a representative corpus establishes quality, latency, and cost budgets.

## OpenRouter / Qwen multimodal contract

### Model policy

Configuration—not application code—selects model IDs:

- default cost lane: `qwen/qwen3.7-flash`
- schema-enforcing fallback/evaluation lane: `qwen/qwen3-vl-30b-a3b-instruct`
- optional premium evaluation lane: `qwen/qwen3-vl-235b-a22b-instruct`

`qwen/qwen3.6-flash` is not selected: at the 2026-09-04 review price it is more expensive than Qwen3-VL 30B for both input and output. Qwen3.7 Flash is materially cheaper than both, but currently has a single upstream provider and supports JSON output without JSON-Schema enforcement. The gateway must therefore validate its response locally and preserve a fallback lane.

This is a dated starting recommendation, not a permanent model lock. Deploy preflight verifies that configured models still support the requested modality and output mode, required context, privacy policy, and acceptable providers.

### Gateway requirements

- A single server-side `VisionGateway` owns OpenRouter requests; browser clients never hold provider keys.
- Prefer the official OpenRouter TypeScript SDK for the new gateway. An OpenAI-compatible adapter is allowed only behind the same interface and contract suite.
- The Qwen3.7 Flash lane requests JSON output, includes the compact schema/constraints in the versioned prompt, and validates the parsed result with the executable VIDEON schema. Invalid output receives at most one bounded repair attempt, then falls back to the schema-enforcing lane or fails retryably.
- The Qwen3-VL 30B fallback lane uses strict JSON Schema responses and `provider.require_parameters: true`.
- Provider routing denies data collection. Where contractual policy requires zero-data-retention, set ZDR and fail closed when no eligible endpoint exists.
- Provider allow/order/fallback policies are environment configuration and are logged by effective route.
- Use a stable pseudonymous tenant/user hash for abuse attribution, not PII.
- Capture OpenRouter request id, actual model/provider, prompt/completion/reasoning/cached token counts, cost, latency, and retry history.
- Retry only transient failures with bounded exponential backoff and jitter. Schema failures get a limited repair/retry path and remain observable.
- Application-level fallback may change model/provider only when policy permits it and the run records the change.

### Scene insight schema v1

At minimum (legacy rows remain readable):

```json
{
  "schemaVersion": "videon.scene-insight.v1",
  "summary": "string",
  "subjects": [{ "label": "string", "attributes": ["string"], "evidenceFrameIds": ["string"] }],
  "actions": [{ "label": "string", "startMs": 0, "endMs": 0, "evidenceFrameIds": ["string"] }],
  "setting": { "location": "string", "timeOfDay": "string", "details": ["string"] },
  "mood": ["string"],
  "notableDetails": [{ "text": "string", "evidenceFrameIds": ["string"] }],
  "safetyFlags": ["string"]
}
```

All fields receive bounded lengths/cardinalities in the executable schema. IDs must reference frames from the request. Claims without evidence remain distinguishable from observed details. Schema evolution is additive within a version and explicit across versions.

### Scene insight schema v2

Production writes use `videon.scene-insight.v2` with prompt contract `videon.scene-analysis-prompt.v2`.

```json
{
  "schemaVersion": "videon.scene-insight.v2",
  "summary": "string",
  "objects": [{
    "id": "obj_1",
    "label": "Porsche 911",
    "category": "vehicle",
    "attributes": ["yellow"],
    "count": 1,
    "evidenceFrameIds": ["f0"]
  }],
  "people": [{
    "id": "p1",
    "count": 1,
    "apparentAgeRange": "middle_adult",
    "apparentPresentation": ["light_skin"],
    "role": "bystander",
    "evidenceFrameIds": ["f1"]
  }],
  "setting": {
    "location": "urban_street",
    "timeOfDay": "day",
    "environment": ["outdoor"],
    "details": []
  },
  "composition": {
    "shotType": "medium_wide",
    "cameraMotion": "static_or_slow_pan",
    "dominantColors": ["yellow", "gray"]
  },
  "actions": [{
    "label": "vehicle_passing",
    "startMs": 0,
    "endMs": 2400,
    "actorIds": ["obj_1"],
    "evidenceFrameIds": ["f0"]
  }],
  "brandCandidates": [{
    "text": "Porsche",
    "kind": "logo_or_wordmark",
    "objectId": "obj_1",
    "evidenceFrameIds": ["f0"],
    "confidence": "likely"
  }],
  "mood": ["dynamic"],
  "notableDetails": [],
  "safetyFlags": [],
  "observedVsInferred": "observed_primary"
}
```

Rules:

- `people` / `objects` are **observed** descriptions, never identity claims.
- `apparentAgeRange` is one of `child|teen|young_adult|middle_adult|older_adult|unknown`.
- `object.category` is one of `vehicle|product|prop|animal|text_on_screen|other`.
- `brandCandidates` are OCR/logo hints for Brandion — never Brandion entity IDs invented by the LLM.
- Every fact list carries `evidenceFrameIds` that must reference sampled frames from the request.
- Executable local validation remains mandatory for the Flash lane; provider JSON Schema is used on the fallback lane.
- Unique persistence key remains `(analysis_run_id, scene_key, schema_version)` so v1 and v2 rows can coexist.

### Brand compliance seam

VIDEON describes media; Brandion owns brand guideline truth.

1. After vision succeeds, VIDEON enqueues a Collection-scoped `brand_compliance` stage.
2. VIDEON resolves the Collection active guideline via Brandion `GET /api/guidelines/active-pack?platformProjectId=…` (service secret + federation contract headers).
3. Evidence: re-extract up to 3 JPEG keyframes from the source media at brand-candidate `evidenceFrameIds` / remaining `frame_refs` / scene midpoint; send each as a Brandion image run with OCR when `brandCandidates` are present. Aggregate worst-case across frames (`fail` > `queued_pending_brandion` > `warn` > `skipped` > `pass`).
4. Check API: Brandion `POST /api/guidelines/:id/analysis-runs` with `input.kind: "image"` once per evidence frame (same machine auth as CREATION consume). Store per-frame run ids under `result.frameRuns` / provenance.5. Output stored in VIDEON as `media_brand_checks` with status `queued_pending_brandion|running|pass|warn|fail|skipped`, Brandion run id, result JSONB, and provenance.
6. Missing Brandion config or retryable upstream errors stay `queued_pending_brandion` — never a synthetic pass. No active guideline → `skipped`.

Cross-product flow (V6): Creation asset → VIDEON analysis → Brandion guideline check, without moving domain state into PLEXON.

### Direct-video lane

Qwen3.7 Flash advertises native video input on OpenRouter. VIDEON may benchmark this against the frame-evidence path for temporal/action understanding. It remains opt-in until the following are demonstrated:

- private media is transferred without a public URL and within provider/request limits;
- provider retention, ZDR/region policy, and customer consent meet the environment contract;
- a bounded transcode/clip policy controls bytes, duration, resolution, and cost;
- results retain useful time evidence and meet the same output validation contract;
- outages remain recoverable despite the current single-provider route.

Even when enabled, local probe, validation, scene detection, derivatives, and durable orchestration remain necessary. Direct video is another gateway input strategy, not a replacement for the pipeline.

## UI implementation contract — mandatory

- All new and rebuilt VIDEON surfaces are composed from `@msqdx/ui` primitives and the v3 AppShell conventions.
- If a reusable primitive is missing, implement and validate it in `msqdx-ui` first, then consume it from VIDEON. Do not create a product-local clone.
- Reuse the established Audion chat/Assistant composition, focus behavior, responsive overlay, and theme protocol.
- Use shared design tokens, typography, spacing, icons, forms, feedback, data-display, navigation, and accessibility states; do not copy legacy Tailwind/CSS chrome.
- No MUI and no `@msqdx/react` for new or rebuilt surfaces.
- Component work includes `msqdx-ui` Storybook coverage where a shared primitive changes, plus keyboard, focus, contrast, reduced-motion, empty/loading/error, and responsive smoke coverage in VIDEON.
- A local domain composition may combine shared primitives, but a local base primitive or divergent token system requires an accepted cross-repository ADR and is otherwise rejected in review.

## Security and privacy gates

V1 is a release blocker, not backlog polish.

- Remove public service-control routes and all shell/Docker control from the web API.
- Remove seeded default credentials and secret fallbacks; startup fails when required secrets are absent.
- Replace reflective CORS with an explicit environment allowlist.
- Apply authentication to every non-public router and authorization to every resource lookup/mutation.
- Bind uploads, assets, analyses, cuts, shares, and exports to a workspace and verify Collection access server-side.
- Use short-lived signed upload/download URLs, MIME/content validation, size quotas, checksum verification, and malware/quarantine hooks.
- Keep service auth distinct from end-user auth; reject the internal test bypass outside tests.
- Encrypt transport and storage per deployment policy; redact provider payloads and signed URLs from logs.
- Define retention/deletion semantics before external customer media is accepted.
- Document OpenRouter/provider data policy by environment. Customer workloads default to data-collection denied and, when required, ZDR/EU routing.
- Secrets are injected through the platform secret store and rotated without image rebuild.

Threat-model evidence and negative authorization tests are required for the production gate.

## UX and navigation

The v3 product surface consists of:

- Collection switcher sourced from PLEXON accessible Collections.
- Collection-scoped library with upload, processing state, filters, and search.
- Media detail with player, temporal scenes, transcript, structured insights, and job history.
- Cut editor and export center after the foundation wave.
- Clear empty, pending, degraded, archived, quota, and failure states.
- Central Assistant flyout composed from the established Audion/`@msqdx/ui` pattern.

Stable deep links are defined in the API companion. PLEXON renders only a summary card and launch actions; complex media workflows remain in VIDEON.

## Capability catalog

Capabilities are registered progressively after their execution endpoints exist:

| Capability id | Kind | Mode | Result |
|---|---|---|---|
| `videon.media.search` | read | Agent | bounded media/scene matches with deep links |
| `videon.analysis.get` | read | Agent + Flow | structured run/scene summary |
| `videon.analysis.run` | job | Agent + Flow | accepted job reference, then poll/subscription |
| `videon.cut.create` | write | Agent + Flow | Cut id and editor link; explicit confirmation in chat |
| `videon.export.run` | job | Flow first | export job and signed result reference |
| `videon.reframe.run` | job | Flow, later | reframe job and derivative reference |

**Agent surface:** Product MCP (`videon-v3/specs/domain/mcp-server.md`) + Plexon wire-up (`specs/domain/assistant-videon-mcp.md`). Catalog inputs must include `platformProjectId`; execution verifies access again. Agent results are bounded summaries and links, not video binaries or full transcripts. Write/job capabilities use idempotency keys and confirmation policy consistent with the central catalog.

## Collection Knowledge Pack

VIDEON publishes a compact `media_insights` facet (registered in `specs/domain/collection-knowledge-pack.md` and `specs/api/collection-knowledge-pack.md`).

| | |
|--|--|
| **Ownership** | VIDEON |
| **Merge** | Replace-by-publisher; union `highlights` / `sceneRefs` by id with caps |
| **Freshness** | Stale after 7 days without republish |
| **Limits** | summary ≤ ~2k; highlights ≤ 12; sceneRefs ≤ 20; facet ≤ 32 KiB |

Allowed: campaign/media summaries, recurring themes, claims, observed scene refs + deep links.  
Forbidden: raw video, complete transcripts, signed object URLs, unbounded per-frame data.

Publisher: VIDEON `POST …/knowledge/facets/media_insights/publish` (service) after analysis/search distillate jobs. Plexon Assistant may consume/cite the facet in Collection context.

## Observability and service levels

Required signals:

- request rate/errors/latency by route and Collection (pseudonymous labels only)
- queue depth, age, lease loss, retries, dead letters, and stage duration
- pipeline completion and failure by stage/version
- OpenRouter latency, status, effective model/provider, schema failures, tokens, and cost
- storage throughput/error/quota and orphan derivative counts
- federation sync status and contract-version mismatch
- access denials and suspicious share/download activity

Initial proposed objectives:

- synchronous API p95 below 500 ms excluding signed object transfer and job work
- accepted job durable and status-readable within 1 second
- job status freshness below 5 seconds
- zero cross-Collection authorization leaks in automated negative tests
- zero unreviewed destructive schema changes during deploy

End-to-end analysis latency and cost objectives are set after the representative-corpus benchmark because they depend on media duration and selected stages.

## Delivery waves and gates

### V0 — Accept contracts and ADRs

- Accept this domain spec and `specs/api/videon-federation.md`.
- Decide repository strategy (`videon-v3` is recommended), queue implementation, object store, transcript adapter, retention baseline, and provider privacy tier.
- Add shared JSON fixtures for federation and scene insight schema.
- Record source-code extraction/licensing provenance.

**Gate:** owners, wire formats, terminology, security boundaries, and migration scope are approved; fixtures validate in both repositories.

### V1 — Make the source safe and reproducible

- Disable/remove unauthenticated operations endpoints and default credentials.
- Enforce route auth/authorization and workspace ownership in tests.
- Replace startup schema push with reviewed migrations.
- Repair CI branch/package commands; use a supported Node LTS; establish lockfile policy.
- Add a reproducible FFmpeg/Python worker image and fixture corpus.

**Gate:** critical findings in the evaluation are closed; CI runs on the default/protected branches; security negative tests pass.

### V2 — v3 shell, auth, and Collection mirror

- Scaffold VIDEON v3 with sibling AppShell/auth/runtime patterns and `@msqdx/ui`; upstream missing shared primitives to `msqdx-ui` with Storybook/accessibility coverage.
- Implement accessible-Collection picker, provisioning upsert/read, origin callback, archive/read-only behavior, and federation health.
- Implement workspace/media schema and direct object-store upload without vision.
- Add PLEXON binding placeholder/sync only after product contract tests pass.

**Gate:** a user can enter from PLEXON, see only assigned Collections, upload media into one Collection, archive/restore safely, and deep-link both ways.

### V3 — Durable core pipeline

- Implement the persisted stage graph, outbox/queue, restart recovery, idempotency, cancellation, retries, and dead-letter operations.
- Port probe, scene detection, frame extraction, transcript, derivatives, and core search.
- Make pipeline progress observable in the UI and API.

**Gate:** worker-kill/restart, duplicate delivery, partial failure, and retry scenarios pass; no polling-only or fire-and-forget execution remains.

### V4 — OpenRouter shadow and cutover

- Implement `VisionGateway`, local schema validation/repair, strict-schema fallback, privacy routing, deploy preflight, accounting, and hierarchical aggregation.
- Benchmark Qwen3.7 Flash against Qwen3-VL 30B and the optional direct-video lane on a versioned representative corpus for accuracy, schema validity, temporal evidence, cost, and latency.
- Shadow a bounded set against the legacy Qwen path without exposing shadow output to users.
- Canary OpenRouter, then make it the production default. Remove production MLX/Ollama/Swift dependencies and their secrets after the observation window.

**Gate:** quality threshold, budget, provider/privacy policy, fallback behavior, and structured-output success are approved; rollback to vision-disabled/retry-later remains available.

### V5 — PLEXON summary, Assistant, and catalog

- Add VIDEON summary/launch to the Collection dashboard.
- Add VIDEON page context and Assistant embed support.
- Register read capabilities first, then confirmed job/write capabilities.
- Ingest `llm_request` usage with idempotent provider facts; do not invent unknown billing events.

**Gate:** dashboard, deep links, context, auth, capability invocation, polling, usage idempotency, and degraded-state contract tests pass.

### V6 — Cross-product flows and knowledge distillates

- Register bounded Flow nodes for analysis/search/export where user journeys justify them.
- Publish `media_insights` distillates (facet registered; publisher + Assistant consume).
- Exercise a cross-product flow, for example Creation asset → VIDEON analysis → Brandion guideline check, without moving domain state into PLEXON.

**Gate:** reruns are idempotent, provenance is retained, payloads remain bounded, and product-local state ownership is intact.

### V7 — Production rollout and legacy disposition

- Run staging load, security, restore, storage lifecycle, provider outage, and cost-budget exercises.
- Canary by tenant/Collection, then expand with observed metrics.
- Migrate only explicitly mapped legacy workspaces/cuts; quarantine unresolved ownership.
- Archive the legacy runtime after export/rollback window and remove obsolete model services.

**Gate:** production runbook, on-call ownership, backup/restore evidence, deletion/retention procedure, and rollback drill are signed off.

## Test contract

Every behavior-changing wave includes:

- unit tests for policies, schemas, state transitions, and access checks
- federation contract tests in PLEXON and VIDEON using shared fixtures
- integration tests with PostgreSQL, queue, object storage, worker, and a stubbed OpenRouter endpoint
- UI smoke for Collection entry, library, media state, deep links, Assistant context, and archived/degraded cases
- end-to-end upload → pipeline → search → Cut/export happy path when those stages land
- negative multi-tenant tests for every resource type and signed URL
- restart/idempotency tests for every job stage
- structured-output corpus tests and model/provider conformance preflight
- build, lint, typecheck, migration validation, and dependency/security scans

Tests must never call paid OpenRouter endpoints by default. Live-model evaluations are explicit, budget-capped, tagged, and separated from CI.

## Rollback principles

- PLEXON shows VIDEON as unavailable/degraded when its federation health or URL is absent; other Collection capabilities continue.
- New analysis can be disabled without disabling library/read/export access.
- In-flight jobs remain persisted and can be paused/resumed; deploys do not discard them.
- OpenRouter model/provider config can roll back independently of application deploy.
- After the production cutover, rollback means queueing vision for later or selecting another approved OpenRouter route—not silently returning to an unmanaged local model service.
- Schema migrations are expand/migrate/contract; destructive contraction follows backup and verified compatibility windows.

## Definition of done

VIDEON is integrated when:

1. a PLEXON Collection creates and maintains a healthy `videon` binding;
2. users see only their accessible Collections and every domain resource is Collection-scoped;
3. upload and the durable pipeline survive duplicates, worker restarts, and transient provider failure;
4. OpenRouter/Qwen3.7 Flash plus its schema-enforcing fallback produces schema-valid, traceable scene insights within approved quality/cost/privacy budgets;
5. PLEXON dashboard, deep links, usage, Assistant context, and registered capabilities pass contract tests;
6. UI uses the v3 shell and shared UI primitives;
7. critical legacy security hazards are absent;
8. backup/restore, retention/deletion, monitoring, on-call, canary, and rollback procedures are exercised;
9. legacy model services and unsafe operations routes are removed from production.

## Decisions still requiring stakeholder sign-off

| Decision | Recommendation | Deadline |
|---|---|---|
| Repository | Create `chbrdk/videon-v3`; import reviewed domain modules with provenance | V0 |
| Object storage | Reuse Storion only if it satisfies signed multipart, tenant scoping, lifecycle, and local/staging parity; otherwise use the ecosystem S3 adapter | V0 |
| Durable queue | Decide by ADR using restart/idempotency benchmark; avoid tying the public contract to the implementation | V0 |
| Provider privacy | Data collection denied by default; require ZDR and/or EU endpoint for customer media where contracts demand it | V0 before external data |
| Legacy migration | Opt-in only, with ownership mapping report; no blanket backfill | V7 |
| VIDEON-specific billing | Begin with exact `llm_request` usage; define compute/storage/export event conversion before emitting new event types | V5/V6 |
