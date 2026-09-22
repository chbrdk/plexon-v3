# SPIRION Welle 2 — implementation tickets (from corpus spec)

**Date:** 2026-09-22  
**Spec:** `specs/domain/spirion-campaign-motif-corpus.md`  
**Runbook:** `knowledge/spirion-campaign-motif-corpus.md`  
**Status:** Backlog derived from accepted plexon domain spec (implementation lives primarily in SPIRION / dig-api)

Do **not** HTML-scrape Behance. Upload first; Dribbble OAuth second.

---

## Epic A — Asset model + composition packs (P0)

### A1 — `assetKind` on library rows
- Add `assetKind` enum (`web_screen` default for existing captures).
- Migrate existing captures → `web_screen`.
- API/list responses expose kind + `craftEligible` + `enrichmentStatus`.
- **Done when:** list filter `assetKind=web_screen` returns today’s corpus unchanged.

### A2 — `composition_contract` schema
- Persist composition pack fields per spec (focal, hierarchy, negativeSpace, typeRoles, colorAxes, marginBleed, layoutFamily, avoid[], ctaRole).
- Validation + JSON schema in SPIRION.
- **Done when:** enrichment can write a valid contract; invalid payloads rejected.

### A3 — `output_contract` on prompt pack
- Extend pack tool: `composition` | `graphic` | `auto` (+ keep `both` / look / rhythm).
- `auto` derives from `assetKind`.
- **Done when:** MCP `capture_prompt_pack` / asset pack returns composition for a graphic fixture.

### A4 — `craftEligible` + licenseClass
- Enforce: `unknown` → not craft-eligible by default.
- Uploads → `customer_owned` or Collection scope as designed.
- **Done when:** craft list helpers can exclude non-eligible assets.

---

## Epic B — Bulk upload ingest (P0)

### B1 — Bulk upload API / job
- Accept multi-image upload (zip or multipart).
- Create `SpirionAsset` rows (`source=upload`), store media in SPIRION storage (not external hotlink).
- Queue enrichment.
- **Done when:** operator can upload ≥20 images; rows appear with `enrichmentStatus=pending|ready`.

### B2 — Enrichment worker for graphics
- Vision/LLM → draft `composition_contract` + tags + format guess (aspect).
- Quality reject/flag thin/watermark spam.
- Idempotent on content hash.
- **Done when:** ≥90% of a 50-image studio set reach `ready` with non-empty `avoid[]` or hierarchy.

### B3 — Operator smoke checklist
- Document upload → pack → inspect in `knowledge/spirion-campaign-motif-corpus.md` (extend smoke section when shipped).

---

## Epic C — MCP + plexon consume (P0/P1)

### C1 — MCP list filters
- List tools accept `assetKind` (and optional `craftEligible=true`).
- Keep captures_* aliases; optional `assets_list` alias.
- **Done when:** plexon catalog still classifies tools; staging list filter works.

### C2 — plexon landing path unchanged
- `spirion_section_ref_v1` continues to prefer `web_screen` + `both`.
- **Done when:** existing landing gate/eval still green.

### C3 — Craft module `campaign_motif_ref_v1` (P1, after C1)
- plexon: module + eval briefs + optional soft gate.
- Prefer graphic kinds + `output_contract=graphic`.
- **Done when:** unit resolve + depth prompt contain module; smoke on staging.

---

## Epic D — Dribbble connector (P1)

### D1 — OAuth app + secrets
- Register Dribbble v2 app; Coolify env for client id/secret (no commit of secrets).
- Document env keys in SPIRION + plexon `knowledge/paths.md` when exposed.

### D2 — Sync job
- OAuth `public`; pull authorized user/team shots; copy media into SPIRION storage.
- Provenance: `source=connector:dribbble`, `sourceId`, fetch time, policy version.
- Rate-limit aware; `licenseClass=connector_tos`; default `craftEligible=false` until review/allowlist.
- **Done when:** sync of one studio account yields ≥10 enriched assets without hotlinking Dribbble CDN as SSOT.

### D3 — Review allowlist
- UI or admin flag to mark connector assets craft-eligible.
- **Done when:** only allowlisted connector assets appear in Creation graphic craft selection.

---

## Epic E — Later connectors (P2)

### E1 — DAM / Drive / RSS folder sync  
### E2 — Pinterest API (app review) as moodboard lane  
### E3 — Behance only via curated export / partnership — **no scrape**

---

## Suggested build order

1. A1 → A2 → A4 → B1 → B2 → A3 → C1 → C2  
2. C3 (plexon module)  
3. D1 → D2 → D3  
4. E*

## Out of scope for these tickets

- Brandion token invent/push  
- Full-site public crawl of Dribbble/Behance/Pinterest  
- Replacing web landing Spirion gate
