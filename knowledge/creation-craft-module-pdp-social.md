# Craft modules: PDP + Social Proof

**Date:** 2026-09-14  
**Code:** `lib/assistant/creation-craft-modules.ts`  
**Ids:** `pdp_detail_v1` · `social_proof_row_v1`

## PDP (`pdp_detail_v1`)

Triggers: PDP, Produktdetail, product page, buy box, add to cart, …  
Section map: slim nav → product hero (media + display + buy CTA) → specs grid → optional social → footer CTA.  
Quality job stays `landing` (hero mass + CTA).

## Social proof (`social_proof_row_v1`)

Triggers: Happy Customers, logo row, trust bar, 4-up icons, Kundenlogos, …  
Pattern: title + sub → `SiteGrid` columns=4 → optional More.  
Composes with PDP or wireframe; with restyle prefers `apply_ops`.

## Eval briefs

`de-pdp-31`, `en-pdp-32`, `de-social-33`, `en-social-34`.
