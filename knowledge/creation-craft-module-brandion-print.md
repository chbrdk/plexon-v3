# Craft modules: Brandion Bind + Print Chapter Rhythm

**Date:** 2026-09-14  
**Code:** `lib/assistant/creation-craft-modules.ts`  
**Ids:** `brandion_bind_pass_v1` · `print_chapter_rhythm_v1`  
**Roadmap:** `knowledge/creation-craft-spirion-section-modules.md`

## Brandion bind (`brandion_bind_pass_v1`)

Triggers: Brandion, active pack, token bind, `set_token_binding`, brand tokens, …  
Formats: landing · newsletter · print magazine · print report.  
Procedure: after Hex craft → `creation_brand_tokens_get` → `set_token_binding` via `apply_ops`; never invent/push Brandion tokens.  
Skip gracefully when pack missing (keep literals).

## Print chapter rhythm (`print_chapter_rhythm_v1`)

Triggers: **always** on `creation_print_magazine_v1` / `creation_print_report_v1` (explicit: chapter, folio, seitenfolge, …).  
Pattern: Cover `PrintPage` → Chapter page(s) → Folio/close; Print* only; print-channel tokens when pack present.

## Compose

Landing: Spirion + brandion (when asked).  
Print: print_chapter always; + brandion when bind phrasing.

## Eval briefs

`de-brand-51`, `en-brand-52`, `de-chapter-53`, `en-chapter-54`.
