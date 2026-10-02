# CREATION → Magcloud slide handoff

## Status
**Accepted** — Wave 1 shipped 2026-10-02 (CREATION publish BFF + Magcloud deliver + Edit in Creation).

**Federation:** `2026-05-plexon-federation-v3`  
**Companions (product twins):**  
- CREATION: `creation-v3/specs/domain/magcloud-slide-handoff.md` · `creation-v3/specs/api/magcloud-slide-handoff.md`  
- Magcloud: `magcloud/slide-universe/specs/domain/creation-slide-consume.md` · `magcloud/slide-universe/specs/api/creation-deliver.md`  
**Related:** `collection-projects.md` · `magcloud-capability.md` · CREATION `scene-surface-export.md` · `composition-magazine-pdf.md` · Magcloud `deck-ingest-pipeline.md` · `deck-sharepoint-bridge.md`

## Goal
Let Collection capabilities produce **brand-true slide frames** in CREATION and land them on Magcloud’s **spatial pitch surface** — without turning CREATION into a second Magcloud canvas or Magcloud into a layout editor.

## Decision (locked for Wave 1)

| Concern | Owner |
|---------|--------|
| Collection identity / access | PLEXON |
| Brand tokens | Brandion (CREATION binds paths only) |
| KPI / scan / journey **truth** | Metron / Checkion / Audion (etc.) — CREATION may **display** projections, never invent domain facts |
| Layout / composition / export pixels | CREATION |
| Spatial board, orbits, collab present, pitch narrative | Magcloud |
| Cross-product orchestration / Assistant intents (later) | PLEXON capability catalog |

Wave 1 handoff is **bidirectional navigation + asset push**:
1. CREATION **Publish to Magcloud** — export raster → Magcloud board (same Collection).
2. Magcloud **Edit in Creation** — deep-link back to the CREATION scene when provenance exists.

Live Scene-JSON embedding inside Magcloud and auto-refresh of Magcloud pixels on every CREATION save remain **out of Wave 1** (re-publish updates the stand).

## Why CREATION helps Magcloud
Magcloud already ingests PPTX stands. Ecosystem apps (Checkion findings, Metron charts, Audion personas, …) need **on-brand slide frames**, not a second PowerPoint. CREATION already owns Brandion-bound scenes + surface/Magazin export. Magcloud already owns constellation UX. The missing piece is a **Collection-scoped publish + return-edit contract** between them.

## Actors

| Actor | Role |
|-------|------|
| Designer / presenter | Authors or selects a CREATION scene page; chooses Magcloud `boardName`; publishes; later re-opens via **Edit in Creation** |
| CREATION | Renders page(s) to PNG (or PDF); calls Magcloud ingest with service/user auth; hosts `/editor` deep-link |
| Magcloud Universe | Creates/merges slide assets onto the board; shows **Edit in Creation** when provenance is present |
| Plexon Assistant (later) | Optional intents `publish_creation_slide_to_magcloud` / open editor with Confirm |

## Product rules
1. **Same Collection only** — `platformProjectId` on the CREATION scene MUST match the Magcloud board’s Collection binding. Cross-Collection publish is forbidden.
2. **No invented facts** — labels/numbers on frames MUST come from bound product data or explicit designer text; Magcloud MUST NOT reinterpret export pixels as structured domain truth.
3. **Publish, not autosave** — explicit user (or Assistant Confirm) action; no continuous editor autosync into Magcloud (same philosophy as the PowerPoint bridge).
4. **CREATION does not call SharePoint Graph** for this path; Magcloud does not call Brandion for this path.
5. **Unbound board name allowed** only when Magcloud already allows create-or-merge by `boardName` inside the Collection workspace (parity with bridge unbound publish).
6. **Edit in Creation is provenance-gated** — Magcloud MUST show the control only when slide/note meta has `source: "creation_scene"` and a non-empty `sceneId`. PPTX / PA-bridge / local-upload slides MUST NOT fake a CREATION deep-link.
7. **Re-publish refreshes pixels** — editing in CREATION does not silently mutate Magcloud assets; user publishes again (or Wave 3 live `sceneRef`).

## Wave 1 contract (conceptual)

### Export (CREATION)
Reuse existing surface export where possible:
- Preferred: **PNG per artboard/page** (`scene-surface-export` family, scale ≥2).
- Optional: Magazin PDF pages when the scene is Print*-authored — Magcloud MAY rasterize PDF via existing LibreOffice/poppler path **or** reject PDF in Wave 1 and require PNG (implementation pick; API MUST document).

### Deliver (Magcloud)
New or extended ingest entry (name TBD in Magcloud API twin), e.g.:
- `POST /api/decks/creation/deliver` **or** reuse a generalized “image slide ingest” used by Admin upload.

Required fields (conceptual):

| Field | Required | Notes |
|-------|----------|-------|
| `platformProjectId` | yes | Collection scope |
| `boardName` | yes | Target Magcloud board slug |
| `file` / pages[] | yes | PNG (Wave 1) or documented PDF |
| `source` | yes | constant `creation_scene` |
| `sceneId` | yes | CREATION scene id for provenance **and** Edit-in-Creation |
| `pageId` / `pageIds` | yes | Which artboard(s); store per slide for return deep-link |
| `title` | no | Note/slide label (designer or scene name) |
| `intent` | no | default `publish` |

Auth: Magcloud write secret / user-proxied federation header — **not** the Power Automate bridge secret (different blast radius). Bridge secret stays for external PPTX push only.

### Board effect
- Each exported page becomes one Magcloud **slide asset** (JPEG/PNG under uploads/slides) attached to a **note** (or backlog card) on `boardName`.
- Default: **append** as new note(s); optional `mergeNoteId` later.
- Preserve CREATION provenance on the slide/note meta: `{ source: "creation_scene", sceneId, pageId, exportedAt, platformProjectId }` — no Brandion secrets.

### Edit in Creation (Magcloud → CREATION)
When provenance is present, Magcloud Admin / slide chrome exposes **Edit in Creation** (German UI MAY use „In CREATION bearbeiten“).

Deep-link (no hardcoded FQDN — env `NEXT_PUBLIC_CREATION_URL` / Magcloud runtime-config):

```text
{CREATION}/editor?sceneId={sceneId}&platformProjectId={platformProjectId}
```

Optional later: `&pageId={pageId}` once CREATION editor launch focuses an artboard (Wave 1 MAY open scene only).

Rules:
1. Open in a new tab / window (do not iframe CREATION inside Magcloud Wave 1).
2. Same Collection: if Magcloud board `platformProjectId` ≠ provenance `platformProjectId`, hide or disable the button (fail closed).
3. Missing CREATION origin env → hide control (no broken href).
4. After edits, presenter uses CREATION **Publish to Magcloud** again to refresh the constellation raster (or Magcloud MAY offer “Re-publish from CREATION” later calling the same deliver with stored ids).

## Waves

| Wave | Deliverable |
|------|-------------|
| **0** | This spec + product twins + keep-drop pointers |
| **1** | CREATION “Publish to Magcloud”; Magcloud image-slide ingest + provenance; Magcloud **Edit in Creation** deep-link; Collection-scoped auth |
| **2** | Multi-page batch; `pageId` focus in editor launch; **Assistant Confirm** via CREATION MCP `creation.scene_publish_magcloud` (Plexon confirm gate); Magcloud board deep-link after publish; **EQC → CREATION pitch slides** (`eqc-pitch-slides.md`) |
| **3** | Optional live `sceneRef` (iframe/island) instead of pixels — only if presentation UX needs edit-in-place |

## Non-goals
- Hosting Magcloud Canvas2D inside CREATION (or vice versa)
- CREATION as Magcloud’s PPTX editor
- Magcloud as Brandion/CREATION layout SoT
- **Edit in Creation** for non-`creation_scene` slides (PPTX/bridge) without an explicit “import pixels → new scene” flow (separate spec)
- Pushing Metron formulas or Checkion scan JSON as slide “truth” without a CREATION (or product) projection step
- Using `MAGCLOUD_SHAREPOINT_BRIDGE_SECRET` for this internal path
- Automatic publish on every CREATION save / automatic Magcloud refresh on CREATION autosave

## Invariants
1. Collection capability boundaries stay intact (`magcloud` vs `creation` product ids).
2. Brand tokens remain Brandion SSOT; exports are **resolved pixels**, not token stores.
3. Magcloud remains SoT for spatial board JSON; CREATION remains SoT for `CompositionScene`.
4. Fail closed on Collection mismatch / missing auth.
5. Publish is explicit (`intent=publish` semantics).
6. **Edit in Creation** never invents a `sceneId`; it only follows stamped provenance.

## Acceptance (Wave 0)
1. Specs exist in Plexon + CREATION + Magcloud twins (including Edit-in-Creation).
2. Knowledge paths list the handoff URLs/env once Wave 1 ships (placeholders OK now).
3. Keep-drop entries mark Wave 1 as next, not done.

## Open questions (resolve in Wave 1 API twin)
1. PNG-only vs PDF-accepted on Magcloud deliver.
2. Single note with stacked slides vs one note per page.
3. Whether Magcloud Admin upload path can be generalized instead of a new route.
4. Service-to-service auth: Plexon-signed user proxy vs product service secret pair.
5. Whether Magcloud stores `NEXT_PUBLIC_CREATION_URL` only or resolves launch via Plexon capability catalog.