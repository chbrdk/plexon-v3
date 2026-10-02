# EQC → CREATION Pitch Slides → Magcloud

**Status:** Accepted · Wave 2 start · **Date:** 2026-10-02  
**Federation:** `2026-05-plexon-federation-v3`  
**Depends:** `creation-magcloud-handoff.md` · `creation-magazine-template-consume.md` · CREATION `artboard-dimensions.md` (`slide-16-9`) · `assistant-creation-agi-lite.md` playbook `creation_eqc_pitch_slides_v1`  
**Knowledge:** `knowledge/eqc-pitch-slides.md`

## Goal

Turn a finished Event Quick Check (CHECKION-backed report) into **editable 16:9 CREATION slides**, then land them on Magcloud via existing Publish — without Magcloud becoming a layout editor and without inventing scan facts.

## Decision (locked)

| Concern | Owner |
|---------|--------|
| Scan / report truth | CHECKION → EQC `EventQuickCheckReportModel` |
| Layout, diagrams, headlines | **CREATION** (Site* on `slide-16-9` / `set_page_frame` 1920×1080) |
| Spatial pitch board | **Magcloud** (PNG + provenance after publish) |
| Orchestration | PLEXON (materialize API + Assistant playbook) |

**Not Wave 2:** binding Checkion JSON directly into Magcloud templates; Magcloud-only HTML slide chrome; autosync Magcloud on every CREATION save.

## Flow

```text
EQC report ready
  → Plexon materialize (prefer published CREATION role quick-check-slides;
     else built-in fixture scene)
  → bind dataSlot from report (same keys as Mag PDF where applicable)
  → POST CompositionScene to CREATION (Collection-scoped)
  → return editorHref
  → user edits in CREATION
  → Publish to Magcloud (Wave 1 BFF)
```

## Template role

| Role | Surface |
|------|---------|
| `quick-check-magazine` | A4 Magazin-PDF (existing) |
| `quick-check-slides` | 16:9 pitch pages (this wave) |

Published templates optional. **Fixture builder** MUST work when no published `quick-check-slides` template exists (parity with Mag PDF legacy fallback philosophy).

## dataSlot keys (slides)

Reuse Mag PDF keys where semantics match; Site* nodes bind via `props.dataSlot` + layout `props.slot` children (`title` / `label` / `body` / `value`):

| dataSlot | Typical page | Source |
|----------|--------------|--------|
| `eqc.cover` | Cover | meta + fazit + KPI tiles |
| `eqc.domain.issues` | Issues | `domain.topIssues` |
| `eqc.domain.comparison` | Comparison | `domainComparison.rows` |
| `eqc.geo.competitors` | GEO | `geo.competitors` |
| `eqc.personas` | Personas | personas list |

Slide fixture MAY use SiteText / SiteStack lists instead of PrintTable — binder writes human-readable text/rows into those nodes.

## API (Plexon)

`POST /api/assistant/event-quick-check/runs/:runId/pitch-slides`

Auth: session user with EQC run access.  
Body optional: `{ "boardHint"?: string }` (informational; Magcloud publish stays in CREATION UI Wave 2).

Response `201`:

```json
{
  "ok": true,
  "sceneId": "…",
  "platformProjectId": "…",
  "editorHref": "https://…/editor?sceneId=&platformProjectId=",
  "pageCount": 4,
  "source": "fixture" | "creation-template"
}
```

## Assistant

Playbook id: `creation_eqc_pitch_slides_v1`  
Triggers: Quickscan/EQC + (Slide|Folie|Pitch|Magcloud|16:9)  
Quality job: `generic`  
Phases: call materialize (or instruct user/tool) → open CREATION → polish → remind Magcloud publish.

## Acceptance

1. Spec + knowledge + inventory pointers.
2. Unit: fixture scene has pages with frame 1920×1080 and bound cover/issues text from a sample report.
3. Unit: playbook resolves EQC+slide phrasing.
4. Route rejects unauthorized / missing report; returns editorHref when CREATION reachable (integration soft-skip if base unset).
