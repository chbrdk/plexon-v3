# Craft module: `spirion_section_ref_v1`

**Date:** 2026-09-14  
**Status:** Shipped  
**Code:** `lib/assistant/creation-craft-modules.ts` · gate `lib/assistant/creation-scene-quality.ts`  
**Spec:** `specs/domain/assistant-creation-agi-lite.md` § Craft modules · `specs/domain/assistant-creation-mcp.md` § Quality gate §9  
**Related:** `knowledge/creation-craft-spirion-section-modules.md` · `knowledge/spirion-mcp-assistant.md`

## What it does

Meta module for **landing** and **newsletter**: before craft, pull Spirion captures and a prompt pack so Look/Rhythm come from real refs, not invented chrome.

## Attach rules

- Always on `creation_landing_v1` and `creation_newsletter_v1` (not only when the user says “Spirion”).
- Compose order: restyle → **spirion** → wireframe → nav → stats → PDP → social → testimonial → faq → bento → blog → pricing → contact → brandion → print chapter (max 3).
- Print playbooks: never attach Spirion; always attach `print_chapter_rhythm_v1`.

## Agent procedure

1. `spirion_captures_list` (limit ~12; **no** `platformProjectId` / `digProjectId`).
2. Pick 1–2 captures matching the section/job.
3. `spirion_capture_prompt_pack` with `output_contract: both`.
4. Derive **own** Hex/type/spacing; honor `look_contract.avoid`.
5. Stamp `craftMeta.spirion.captureIds` on import when possible.
6. Empty `captures: []` → editorial fallback structure; still invent own look (list call satisfies the gate).

## Quality gate

Landing **and** newsletter writes fail finish if neither `captures_list` nor `capture_prompt_pack` appears in the tool trace.

## Eval

Fixture landing pass traces prepend `spirionTools` in `lib/assistant/creation-craft-eval.ts`.
