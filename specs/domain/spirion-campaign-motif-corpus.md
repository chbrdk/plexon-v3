# SPIRION — Campaign / graphic-design motif corpus (Welle 2)

**Status:** Proposed — 2026-09-22  
**Product:** SPIRION (design intelligence) · Federation consumer: plexon-v3 Assistant + CREATION craft  
**Depends:** `specs/domain/assistant-spirion-mcp.md` (Welle 1 web captures) · Collection binding · Brandion active-pack (optional bind pass)  
**Knowledge:** `knowledge/spirion-campaign-motif-corpus.md` · paths in `knowledge/paths.md`

## Purpose

Extend SPIRION beyond **web screens / landings** so agents can craft from **campaign motifs and general graphic design** — Key Visuals, Social Posts, Print Ads, OOH, brand systems — using the same loop:

**reference asset → prompt pack → own literals / Brandion bind → Creation scene (or export artboard)**

Ingest MUST support:

1. **Bulk / studio upload** (already the operational fallback — first-class), and  
2. **Automated connectors** to design aggregators **where ToS + API allow** (preferred: official APIs; never silent scrape).

## Problem (Welle 1 gap)

Welle 1 corpus and packs assume **viewport pages**:

| Field | Web meaning |
|-------|-------------|
| `look_contract` | Type scale, palette, avoid (e.g. equal three-up) |
| `page_rhythm` | Band heights, section order |

Campaign / graphic work needs **artboard composition**, not section scroll rhythm. Reusing web packs alone produces wrong craft (fake “heroes”, wrong margins, wrong CTAs).

## Non-goals

- 1:1 clone of third-party brands or Behance/Dribbble shots into customer deliverables  
- Inventing Brandion tokens from foreign palettes (bind only to Collection active pack)  
- Unbounded open-web crawl without license / rate / provenance  
- Replacing Brandion as guideline SSOT  
- Full generative “make anything” model — SPIRION remains **reference intelligence**

## Asset model

Every library row is a **`SpirionAsset`** (generalization of today’s capture / screen / reference).

### `assetKind` (required)

| Kind | Typical formats | Primary pack |
|------|-----------------|--------------|
| `web_screen` | Desktop/mobile viewport | `look_contract` + `page_rhythm` (Welle 1) |
| `campaign_keyvisual` | 1:1, 16:9, OOH ratios | `composition_contract` |
| `social_post` | 1:1, 4:5, 9:16 | `composition_contract` |
| `print_ad` | A4, A5, bleed+safe | `composition_contract` + print margins |
| `brand_system` | Guidelines spreads, lockups | `composition_contract` + token hints |
| `moodboard` | Multi-image collage | `composition_contract` (weak structure; research only) |
| `other_graphic` | Catch-all curated | `composition_contract` |

WENN `assetKind` fehlt, DANN default `web_screen` for backward compatibility.

### Required metadata

| Field | Notes |
|-------|--------|
| `id` | Stable SPIRION id |
| `assetKind` | See table |
| `source` | `upload` \| `connector:<name>` \| `manual_curated` |
| `sourceUri` / `sourceId` | Provenance (nullable for pure upload) |
| `licenseClass` | `customer_owned` \| `studio_curated` \| `connector_tos` \| `unknown` |
| `format` | `{ aspectRatio?, widthPx?, heightPx?, printMm?, bleedMm?, safeMm? }` |
| `tags[]` | Craft tags (industry, tone, layout family) — not free SEO spam |
| `platformProjectId` | Nullable; library path omits filter (same as Welle 1 captures) |
| `enrichmentStatus` | `pending` \| `ready` \| `failed` |
| `thumbUrl` / `mediaUrl` | Internal storage URLs (not hotlink to aggregator CDN as SSOT) |

### License / provenance rules (hart)

1. Every automated ingest MUST store `source`, `sourceId`, fetch timestamp, and connector policy version.  
2. WENN `licenseClass=unknown`, DANN asset MAY appear in research UI but MUST NOT be selected by Creation craft modules by default (`craftEligible=false`).  
3. Customer uploads → `customer_owned` / Collection-scoped by default.  
4. Connector assets → `connector_tos`; craft use only after enrichment + human or policy allowlist.  
5. No silent ToS bypass (“scrape Behance HTML because API missing”).

## Pack contracts

### Keep (web)

- `look_contract` — typography jumps, palette axes, `avoid[]`  
- `page_rhythm` — band / section rhythm for scroll pages  

### Add: `composition_contract` (graphics / campaigns)

Machine-readable craft hints for a **single artboard**:

| Field | Meaning |
|-------|---------|
| `focal` | Where the eye should land (region or role: product / face / claim) |
| `hierarchy` | Ordered roles: `brand` → `claim` → `support` → `legal` (as present) |
| `negativeSpace` | `tight` \| `balanced` \| `airy` (+ optional % estimate) |
| `typeRoles` | Display / title / body / legal sizes *relative* (not foreign font files) |
| `colorAxes` | Dominant / accent / ground as Hex **inspiration** (not clone mandate) |
| `marginBleed` | Safe / bleed / quiet zone relative to format |
| `layoutFamily` | e.g. `full-bleed-product`, `split-claim-media`, `centered-lockup`, `editorial-column` |
| `avoid[]` | Hard negatives (e.g. `equal-three-icon-row`, `busy-center`, `tiny-legal-collision`) |
| `ctaRole` | Optional — present/absent; graphics often have no web CTA |

### `output_contract` on prompt pack

Extend Welle 1:

| Value | Returns |
|-------|---------|
| `look` | `look_contract` |
| `rhythm` | `page_rhythm` |
| `composition` | `composition_contract` |
| `both` | look + rhythm (web default) |
| `graphic` | composition (+ optional look colorAxes) |
| `auto` | Derive from `assetKind` (`web_screen`→`both`, graphic kinds→`graphic`) |

## Ingest channels

### A — Bulk / studio upload (P0 — ship first)

- Operator or Collection uploads image set (zip/folder/API).  
- SPIRION stores media, creates `SpirionAsset` rows (`source=upload`), queues enrichment job.  
- Same path as “wir liefern jede Menge Bilder” — first production path for campaign motifs.  
- Acceptance: 50 assets → ≥90% `enrichmentStatus=ready` with `composition_contract`.

### B — Connector adapters (P1 — automated)

Each connector is a **policy-bound adapter**, not a crawler script in the assistant.

| Connector | Approach | Fit | Notes |
|-----------|----------|-----|-------|
| **Dribbble** | Official API v2 + OAuth (`public` scope) | **Best first aggregator** | Documented API; rate limits (~60/min, ~1440/day). Listing is primarily **authenticated user / authorized scope** — use for studio accounts, curated follows, or approved team libraries; **not** “download all of Dribbble”. Store copies; respect [API Terms](https://developer.dribbble.com/). |
| **Pinterest** | Official API (app review) | Possible later | Marketing/commerce oriented; heavy review; good for moodboards, weaker as craft SSOT. |
| **Behance** | No reliable public craft API for bulk | **Deprioritize** | Avoid HTML scrape; prefer manual curated export or Adobe partnership later. |
| **Studio RSS / Drive / DAM** | Feed or folder sync | Strong for agencies | Often better quality than public social design feeds. |
| **Licensed stock / brand packs** | Contracted catalogs | Strong | Clear `licenseClass`. |

**Automation principle:** Connector pulls **metadata + media into SPIRION storage**, then runs the **same enrichment** as uploads. Assistant never hotlinks foreign CDNs as craft source of truth.

### C — Manual curated

Editors pin assets into a global or Collection library with tags + `studio_curated`.

## Enrichment pipeline (shared)

For each new asset:

1. Normalize media (thumb + working resolution); strip EXIF as needed.  
2. Vision/LLM analysis → draft `composition_contract` (and web contracts if `web_screen`).  
3. Tag suggestion (layout family, industry, tone).  
4. Quality gate: reject / flag `craft-thin` graphics (empty canvas, illegible type, watermark spam).  
5. Set `enrichmentStatus=ready` and `craftEligible` per license rules.  
6. Persist analysis record (reuse enrichment list/get MCP surface).

Idempotent on `source`+`sourceId` or content hash.

## MCP / Assistant (plexon)

### Tool surface (additive)

| Tool / family | Change |
|---------------|--------|
| `spirion_captures_list` / screens list | Filter `assetKind`; default may remain web for landing module |
| `spirion_capture_prompt_pack` | Honor `output_contract: composition \| graphic \| auto` |
| `spirion_assets_list` (new alias or rename path) | Preferred name for multi-kind library; captures remain alias |
| `spirion_references_*` | May index graphic assets for research intent |
| Connector admin | **Not** in Welle 1 read families — operator/service jobs in SPIRION product |

Planner:

- Landing/newsletter: keep `spirion_section_ref_v1` → prefer `assetKind=web_screen`.  
- New craft module (later code): `campaign_motif_ref_v1` → prefer graphic kinds + `output_contract=graphic`.  
- Print playbooks: may pull `print_ad` / `campaign_keyvisual` for cover energy, still under Print* nodes.

### Creation

- Artboard / Print* / export scenes consume `composition_contract` as literals (margins, hierarchy).  
- Optional `craftMeta.spirion` includes `assetIds`, `assetKind`, composition avoid list.  
- Brandion bind remains optional second pass (`brandion_bind_pass_v1`).

## Phased delivery

| Phase | Deliverable | Owner |
|-------|-------------|--------|
| **P0 Spec** | This document accepted | Plexon / SPIRION product |
| **P0 Upload** | Bulk ingest + enrichment → `composition_contract` | SPIRION |
| **P0 MCP** | `output_contract=graphic\|auto` + kind filter on list/pack | SPIRION MCP + plexon catalog |
| **P1 Creation module** | `campaign_motif_ref_v1` + eval briefs | plexon craft modules |
| **P1 Dribbble connector** | OAuth app + sync job + provenance | SPIRION |
| **P2** | Pinterest / DAM connectors; Collection allowlists | SPIRION |
| **P2 Gate** | Soft/hard craft findings for motif builds | plexon quality |

## Acceptance

1. Spec defines `assetKind`, `composition_contract`, license classes, and ingest channels A/B/C.  
2. Upload path can mark assets `craftEligible` with composition packs without any connector.  
3. Dribbble (or chosen connector) path stores provenance and never relies on HTML scrape.  
4. Web landing path unchanged: `spirion_section_ref_v1` still prefers `web_screen` + `both`.  
5. Knowledge documents operator runbook + connector decision table.  
6. No hardcoded aggregator FQDNs in plexon app code — only env keys documented in `knowledge/paths.md`.

## Open decisions (track in knowledge)

- Rename MCP `captures_*` → `assets_*` vs long-lived aliases.  
- Whether Collection-scoped graphic libraries are default-on for Creation or opt-in.  
- Human review required before `craftEligible=true` for `connector_tos` assets (recommended: yes for P1).
