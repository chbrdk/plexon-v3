# SPIRION — Campaign / print motif allowlist ingest

**Status:** Accepted — 2026-10-07  
**Depends:** `specs/domain/spirion-campaign-motif-corpus.md` (`print_ad` / `campaign_keyvisual`)  
**Knowledge:** dig-api `knowledge/campaign-motif-allowlist.md` · catalog `knowledge/catalogs/campaign-motif-allowlist.json`  
**Sibling:** brand marks stay on `specs/domain/spirion-brand-kit-allowlist.md` (`assetKind=brand_system`)

## Purpose

WHEN operators need **real campaign / print composition references** (posters, key visuals) — not logos —  
THEN dig-api MUST ingest only **allowlisted direct media URLs** (first wave: Wikimedia Commons PD / free files)  
WITHOUT HTML scrape, category crawl, or Dribbble OAuth.

## Requirements (EARS)

1. WENN ein Asset gefetcht wird, DANN MUSS die URL im Allowlist-Katalog stehen und der Host zur Pack-`hostAllowlist` passen.
2. WENN Sync läuft, DANN MUSS Medienkopie in SPIRION-Storage landen (Upload-/Graphic-Pipeline); Commons CDN ist nicht Craft-SSOT.
3. WENN indexiert, DANN MUSS `source=connector:campaign_motif`, `source_id=motif_{packId}_{…}`, `licenseClass=public_domain` (Default für PD-Welle), `craftEligible=false` gelten bis Review-PATCH.
4. WENN `assetKind` gesetzt wird, DANN MUSS `print_ad` oder `campaign_keyvisual` (pro Asset oder Pack-Default) verwendet werden — **nicht** `brand_system`.
5. SOLANGE kein Allowlist-Eintrag existiert, MUSS Sync für unbekannte `packId` mit 404 abbrechen.
6. WENN Originaldateien `maxBytes` überschreiten, DANN MUSS der Katalog eine explizite kleinere Allowlist-URL (z. B. Commons thumb) listen — kein stilles Resize-Crawl.
7. WENN gegen Wikimedia gefetcht wird, DANN MUSS ein policy-konformer `User-Agent` gesetzt sein (Name + Kontakt-URL).

## Non-goals

- Behance / Dribbble HTML scrape  
- Brand-kit / logo corpora (→ brand-kit allowlist)  
- Auto-mark craft-eligible foreign campaigns for 1:1 customer clones  

## Acceptance

1. Unit: host allow / reject off-list URL.  
2. Unit/API: sync queues ≥1 job for a fixture pack URL (or dry-run validation).  
3. Staging: `GET /api/campaign-motifs` lists catalog; `POST …/sync` with Bearer queues jobs; captures show `print_ad`|`campaign_keyvisual` + `connector:campaign_motif`.  
