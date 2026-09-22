# Creation craft — Spirion-backed section modules

**Date:** 2026-09-14  
**Depends:** `creation-craft-playbook-scenarios-next.md` · Spirion tools (`captures_list` → `capture_prompt_pack`)  
**Shipped meta:** `spirion_section_ref_v1` — see `knowledge/creation-craft-module-spirion-section-ref.md`

## Idea

Page modules define **section maps**. Spirion modules supply **visual contracts** from real captures before writing. Brandion bind + print chapter close the format loop.

## Shipped catalog

Restyle · Wireframe · Nav · Stats · PDP · Social · Testimonial · FAQ · Bento · Blog · Pricing · Contact · **`spirion_section_ref_v1`** · **`brandion_bind_pass_v1`** · **`print_chapter_rhythm_v1`**

Module notes:

- `knowledge/creation-craft-module-nav-stats.md`
- `knowledge/creation-craft-module-faq-bento.md`
- `knowledge/creation-craft-module-quote-blog.md`
- `knowledge/creation-craft-module-brandion-print.md`

## How Spirion plugs in (every Spirion-backed module)

1. `spirion_captures_list` (limit ~12; **no** platformProjectId).  
2. Pick 1–2 captures matching the **section**.  
3. `spirion_capture_prompt_pack` (`output_contract: both`) → apply as **literals**.  
4. Prefer `apply_ops` when restyle is also active.  
5. Stamp `craftMeta.spirion.captureIds` + short avoid list.

## Granularity rule

- **Page module** = section map.  
- **Spirion module** = how a section looks.  
- **Brandion bind** = optional second pass after literals.  
- **Print chapter** = always-on rhythm under print playbooks.  
- Compose max 3 per turn.

## Do not

- Clone competitor brand 1:1 from Spirion.  
- Skip pack and invent equal padding stacks.  
- Add a full playbook per section type.  
- Invent Brandion tokens or push tokens to Brandion.

## Status

Catalog wave complete for **web section modules**.  

**Next corpus wave (SPIRION product):** campaign / graphic motifs — `specs/domain/spirion-campaign-motif-corpus.md` · then plexon module `campaign_motif_ref_v1`.
