# Craft module: `campaign_motif_ref_v1`

**Date:** 2026-09-22  
**Status:** Shipped (P1)  
**Code:** `lib/assistant/creation-craft-modules.ts`  
**Spec:** `specs/domain/spirion-campaign-motif-corpus.md`

## What it does

Pull Spirion **graphic / campaign** assets and a `composition_contract` pack before building Key Visuals, social posts, or print-adjacent motifs.

## Attach rules

- Triggered by campaign/keyvisual/social-post/print-ad phrasing (`CAMPAIGN_MOTIF_RE`).
- When attached, **replaces** auto `spirion_section_ref_v1` for that turn (web landing gate stays for non-campaign prompts).
- Allowed on landing + print magazine/report playbooks.

## Agent procedure

1. `spirion_assets_list` / `captures_list` with graphic `assetKind` + `craftEligible=true`.
2. Pick 1–2 assets.
3. `spirion_capture_prompt_pack` with `output_contract: graphic`.
4. Own literals from composition; optional Brandion bind pass.
