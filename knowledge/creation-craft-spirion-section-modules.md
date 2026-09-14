# Creation craft — Spirion-backed section modules

**Date:** 2026-09-14  
**Depends:** `creation-craft-playbook-scenarios-next.md` · Spirion tools (`captures_list` → `capture_prompt_pack`)  
**Shipped meta:** `spirion_section_ref_v1` — see `knowledge/creation-craft-module-spirion-section-ref.md`

## Idea

Page modules (PDP, pricing, contact) define **section maps**. Spirion modules supply **visual contracts** from real captures before writing.

## Already shipped (page-level + Spirion meta + above-fold)

Restyle · Wireframe · **Nav** · **Stats** · PDP · Social · Pricing · Contact · **`spirion_section_ref_v1`** (always on landing/newsletter)

## Next modules (Spirion-first section recipes)

| Module | Trigger | Spirion cue | Craft outcome |
|--------|---------|-------------|----------------|
| `faq_accordion_v1` | FAQ, Fragen | Support/FAQ captures | Stack of Q/A; tight type; no equal three-up |
| `testimonial_quote_v1` | Zitat, Testimonial | Quote/press captures | Quote + name/role; not logo-row |
| `feature_bento_v1` | Features, Vorteile, Bento | Feature grids | Uneven bento / 2+1 — avoid equal three-up |
| `blog_list_v1` | Blog, News, Artikel | Editorial lists | Title + meta + teaser list |
| `brandion_bind_pass_v1` | Tokens binden, Brand pack | — (Brandion) | After Hex craft: optional `set_token_binding` |
| `print_chapter_rhythm_v1` | Magazin Chapter | — (print) | Cover → chapter → folio under print playbook |

## How Spirion plugs in (every Spirion-backed module)

1. `spirion_captures_list` (limit ~12; **no** platformProjectId).  
2. Pick 1–2 captures matching the **section**.  
3. `spirion_capture_prompt_pack` (`output_contract: both`) → apply as **literals**.  
4. Prefer `apply_ops` when restyle is also active.  
5. Stamp `craftMeta.spirion.captureIds` + short avoid list.

## Granularity rule

- **Page module** = section map.  
- **Spirion module** = how a section looks.  
- Compose: e.g. `pricing_compare_v1` + `spirion_section_ref_v1` (max 3).

## Do not

- Clone competitor brand 1:1 from Spirion.  
- Skip pack and invent equal padding stacks.  
- Add a full playbook per section type.

## Suggested build order (remaining)

1. `faq_accordion_v1` + `feature_bento_v1`  
2. `testimonial_quote_v1` · `blog_list_v1`  
3. `brandion_bind_pass_v1` · `print_chapter_rhythm_v1`
