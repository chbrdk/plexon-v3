# Craft modules: Testimonial Quote + Blog List

**Date:** 2026-09-14  
**Code:** `lib/assistant/creation-craft-modules.ts`  
**Ids:** `testimonial_quote_v1` · `blog_list_v1`  
**Roadmap:** `knowledge/creation-craft-spirion-section-modules.md`

## Testimonial (`testimonial_quote_v1`)

Triggers: Testimonial, Kundenstimme, Zitat, Quote, customer quote, …  
Pattern: large quote + name/role (+ optional portrait); max 1–2 stacked quotes.  
Not a logo-row (`social_proof_row_v1`).  
Note: `testimonial` / `kundenstimme(n)` moved **out** of social-proof regex so quotes resolve here.

## Blog list (`blog_list_v1`)

Triggers: Blog list/teaser, News list, Artikelübersicht, editorial list, …  
Pattern: 3–6 rows or teaser cards with date/tag · headline · one-line teaser (+ optional thumb).  
Not a feature bento.

## Compose

Resolve order: … social → **testimonial** → faq → bento → **blog** → pricing → contact (max 3 with Spirion).

## Eval briefs

`de-quote-47`, `en-quote-48`, `de-blog-49`, `en-blog-50`.
