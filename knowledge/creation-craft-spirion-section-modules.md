# Creation craft — Spirion-backed section modules (next)

**Date:** 2026-09-14  
**Depends:** `creation-craft-playbook-scenarios-next.md` · Spirion tools in landing depth (`captures_list` → `capture_prompt_pack`)  
**Code today:** optional Spirion in playbook phase 1; prefetch may list captures

## Idea

Module catalog is strong on **page jobs** (PDP, pricing, contact). Next leap = **section recipes** that pull **Spirion best-practice refs** before writing — so density/look come from real captures, not invented wireframe chrome.

## Already shipped (page-level)

Restyle · Wireframe · PDP · Social · Pricing · Contact

## Proposed next modules (Spirion-first)

| Module | Trigger | Spirion cue | Craft outcome |
|--------|---------|-------------|----------------|
| `spirion_section_ref_v1` | „wie Spirion“, „Referenz“, „best practice“, densify | Always: 1–2 captures → `capture_prompt_pack` (`both`) | Look/rhythm → own Hex/type; cite `captureIds` in craftMeta |
| `nav_chrome_v1` | Nav, Header, Menü | Captures tagged homepage header | Slim row, not mega-IA unless sketch says so |
| `faq_accordion_v1` | FAQ, Fragen | Support/FAQ page captures | Stack of Q/A; tight type; no equal three-up |
| `stats_metrics_v1` | Stats, KPIs, Zahlenband | Landing hero/metrics bands | Row of 3–4 metrics as **one** text shape each (no „3“+„+“) |
| `testimonial_quote_v1` | Zitat, Testimonial | Quote/press captures | Quote + name/role; not logo-row |
| `feature_bento_v1` | Features, Vorteile, Bento | Product feature grids | Uneven bento / 2+1 — avoid equal three-up whole page |
| `blog_list_v1` | Blog, News, Artikel | Editorial list captures | Title + meta + teaser list |
| `brandion_bind_pass_v1` | Tokens binden, Brand pack | — (Brandion) | After Hex craft: optional `set_token_binding` |
| `print_chapter_rhythm_v1` | Magazin Chapter | — (print) | Cover → chapter → folio under print playbook |

## How Spirion should plug in (procedure)

For any Spirion-backed module:

1. `spirion_captures_list` (limit ~12; **no** platformProjectId).  
2. Pick 1–2 captures matching the **section** (not random homepage).  
3. `spirion_capture_prompt_pack` (`output_contract: both`) → apply `look_contract` + `page_rhythm` as **literals**.  
4. Prefer `apply_ops` on existing section when restyle is also active.  
5. Stamp `craftMeta.spirion.captureIds` + short avoid list.

## Granularity rule

- **Page module** = section map (PDP, pricing).  
- **Spirion module** = visual contract for *how* a section looks.  
- Compose: e.g. `pricing_compare_v1` + `spirion_section_ref_v1` (max 3).

## Do not

- Clone competitor brand 1:1 from Spirion.  
- Skip pack and invent equal padding stacks.  
- Add a full playbook per section type.

## Suggested build order

1. **`spirion_section_ref_v1`** (meta — unlocks all others)  
2. `nav_chrome_v1` + `stats_metrics_v1` (above-fold polish)  
3. `faq_accordion_v1` + `feature_bento_v1`  
4. `brandion_bind_pass_v1` · `print_chapter_rhythm_v1`
