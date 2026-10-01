# MAGCLOUD capability — Plexon

## Status
**Wave 3 binding + Collection home** — 2026-10-01. Placeholders, origin, upsert, launch URL, assistant product id, and Collection overview/work-band chip landed.

## Identity
| Field | Value |
|-------|-------|
| Product id | `magcloud` |
| Display | MAGCLOUD (Slide Universe) |
| Repo | `magcloud` — `slide-universe/` + `apps/web` |
| Contract | `2026-05-plexon-federation-v3` |

## Role in the suite
MAGCLOUD is the **spatial pitch / constellation** capability of a Collection: recursive pain-point boards, cinematic orbit decks, collab presentation sync, and pitch assistant. Other products own guidelines, scans, KPIs; MAGCLOUD owns the live spatial narrative surface.

## Invariants
1. No second project type — users see Collections; MAGCLOUD is a capability chip/binding.
2. Creates/boards are Collection-scoped (`platformProjectId`) once federated — never a product-only project UX.
3. Product data (boards, uploads, universe JSON) stays in Magcloud — Plexon stores bindings + launch/summary only.
4. Custom Canvas2D + Antigravity engine is SoT for the workspace; chrome uses `@msqdx/ui`.
5. Upsert skipped while `NEXT_PUBLIC_MAGCLOUD_URL` / `MAGCLOUD_API_URL` unset (placeholder `pending`), same pattern as Metron/Creation early days.

## APIs (Wave 3)
- Origin: `POST /api/platform/provisioning/magcloud-project-origin`
- Upsert: `PUT {MAGCLOUD}/api/platform/provisioning/projects/{platformProjectId}`
- Summary GET: same path with `X-Plexon-User-Id` → Collection dashboard `magcloud` summary
- Launch: `{MAGCLOUD}/projects/{platformProjectId}` Collection workspace (`lib/magcloud-launch-url.ts`) — N boards per Collection
- Audience share: `{MAGCLOUD}/viewer?platformProjectId={id}&boardId={boardId}` (island forces `pres=1`)
- Assistant embed product: `magcloud` (`lib/paths/assistant-embed.ts`)

## Collection home
- Overview magazine chapter `data-chapter="magcloud"`
- Work-band TOC nav `magcloud` → `MagcloudCapabilityView`
- Dashboard BFF: `fetchMagcloudPlatformProjectSummary` + `links.magcloudProject`

## Wave gating
| Wave | Deliverable |
|------|-------------|
| 1 | MSQDX chrome align, Vite/TS, audience default invert |
| 2 | Next AppShell + auth barrels + canvas island (`apps/web`) |
| 3 | `ensureBindingPlaceholders` + mirror + assistant page context + Collection home chip — **done** |
| 4 | Deck ingest pipeline (PPTX → rasterize → classify → vector → board) — Magcloud SoT `slide-universe/specs/domain/deck-ingest-pipeline.md`; deploy apt via `magcloud/nixpacks.toml` / `Dockerfile.universe` |

## Related
- `collection-projects.md` Phase 9
- Product SoT: `magcloud/specs/domain/app-shell.md`, `magcloud/slide-universe/specs/domain/ui-msqdx-align.md`
- Deck ingest: `magcloud/slide-universe/specs/domain/deck-ingest-pipeline.md` · `specs/api/deck-ingest.md`
- Deploy rasterize deps: `magcloud/nixpacks.toml`, `magcloud/Dockerfile.universe`, ops `slide-universe/knowledge/deck-ingest-pipeline.md`
- `magcloud/knowledge/shell-requirements.md`
- Metron pattern: `metron-capability.md`
