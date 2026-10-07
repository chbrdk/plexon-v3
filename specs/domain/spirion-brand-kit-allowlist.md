# SPIRION — Public brand-kit allowlist ingest

**Status:** Accepted — 2026-10-07  
**Depends:** `specs/domain/spirion-campaign-motif-corpus.md` (`assetKind=brand_system`)  
**Knowledge:** dig-api `knowledge/brand-kit-allowlist.md` · catalog `knowledge/catalogs/brand-kit-allowlist.json`

## Purpose

WHEN operators need diverse **public brand marks / guideline imagery** for SPIRION research,  
THEN dig-api MUST ingest only **allowlisted direct asset URLs** as `brand_system` assets  
WITHOUT HTML scraping brand sites.

## Requirements (EARS)

1. WENN ein Asset gefetcht wird, DANN MUSS die URL im Allowlist-Katalog stehen und der Host zur Kit-`hostAllowlist` passen.
2. WENN Sync läuft, DANN MUSS Medienkopie in SPIRION-Storage landen (Upload-/Graphic-Pipeline); CDN ist nicht Craft-SSOT.
3. WENN indexiert, DANN MUSS `source=connector:brand_kit`, `licenseClass=connector_tos`, `craftEligible=false` (Default) gelten bis Review-PATCH.
4. WENN `assetKind` gesetzt wird, DANN MUSS `brand_system` verwendet werden.
5. SOLANGE kein Allowlist-Eintrag existiert, MUSS Sync für unbekannte `kitId` mit 404 abbrechen.

## Non-goals

- Behance/Brand-site HTML scrape  
- Brandfetch as warehouse SSOT  
- Auto-mark craft-eligible company logos for Creation motif rebuild  

## Acceptance

1. Unit: host allow / reject off-list URL.  
2. Unit/API: sync queues ≥1 job for `pulumi` fixture URLs (or dry-run validation).  
3. Staging: `GET /api/brand-kits` lists catalog; `POST …/sync` with Bearer queues jobs; captures show `brand_system` + `connector:brand_kit`.  
