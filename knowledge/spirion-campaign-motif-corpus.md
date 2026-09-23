# SPIRION — Campaign / graphic motif corpus (operator notes)

**Date:** 2026-09-22  
**Spec:** `specs/domain/spirion-campaign-motif-corpus.md`  
**Related:** `knowledge/spirion-mcp-assistant.md` · `specs/domain/assistant-spirion-mcp.md` · craft modules roadmap

## Verdict

Expand SPIRION from **web screens** to **campaign / graphic assets** with the same agent loop.  
**Ship upload+enrichment first**; add **official-API connectors** (Dribbble first) second. Do not HTML-scrape Behance/Pinterest.

## Why not “just crawl Behance”?

| Source | Reality |
|--------|---------|
| Behance | No solid public bulk craft API → scrape = ToS/legal risk |
| Pinterest | Official API exists but app-review heavy; moodboard-skewed |
| Dribbble | Official v2 API + OAuth — best **first** aggregator; mostly **authorized account** shots, not “whole site dump” |
| Bulk upload | Already how studios work — highest craft signal per hour |

## Operating model

```
[Upload zip / DAM / Dribbble sync]
        ↓
  SPIRION storage (own media)
        ↓
  Enrichment → composition_contract (+ tags, license)
        ↓
  MCP list + prompt_pack (graphic | auto)
        ↓
  Creation craft (literals → optional Brandion bind)
```

## Connector decision (P1)

1. **Dribbble** — register app, OAuth `public`, sync selected users/teams/shots into SPIRION; respect rate limits; store copies; set `licenseClass=connector_tos`, `craftEligible` after review.  
2. **Studio Drive/DAM/RSS** — often better than public feeds for agency quality.  
3. **Pinterest** — later, moodboard lane.  
4. **Behance** — curated export only until a real partnership/API exists.

## Pack mental model

- Web landing → `look_contract` + `page_rhythm`  
- Key visual / social / print ad → `composition_contract` (focal, hierarchy, margins, avoid)

## What plexon does vs SPIRION

| Layer | Owns |
|-------|------|
| SPIRION | Asset store, ingest, enrichment, MCP pack tools |
| plexon | Planner families, craft modules, quality gate, Creation MCP loop |
| CREATION | Scene/artboard consume + craft-debug |
| Brandion | Active pack bind (optional) |

## Next build tickets (suggested)

Full ticket breakdown: **`knowledge/spirion-campaign-motif-tickets.md`** (Epics A–E).

1. SPIRION: `assetKind` + `composition_contract` on enrichment  
2. SPIRION: bulk upload job + craftEligible flag  
3. MCP: `output_contract=graphic|auto` + kind filter  
4. plexon: module `campaign_motif_ref_v1` (after MCP ready)  
5. SPIRION: Dribbble connector MVP + provenance fields  

## Smoke (after P0)

1. `POST /api/jobs/images` multipart with `files` + optional `assetKind=campaign_keyvisual`
2. Poll jobs → captures appear with `asset_kind`, `enrichment_status=ready`, `composition_contract`
3. `GET /api/library/captures?assetKind=campaign_keyvisual` (or MCP `spirion.assets_list`)
4. MCP `spirion.capture_prompt_pack` with `output_contract=graphic` → pack includes `composition_contract.avoid` **and** compact `graphic_craft_brief` (literals / rebuild_directives) when enrichment wrote craft metrics.
5. Landing craft without campaign phrasing still attaches `spirion_section_ref_v1` (web_screen path)
6. Prompt „Key Visual Kampagne“ → plexon module `campaign_motif_ref_v1`

## Dribbble (P1)

See SPIRION `knowledge/dribbble-connector.md` — env on dig-api only; no scrape.
