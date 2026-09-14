# Craft module: Restyle / Densify

**Date:** 2026-09-14  
**Code:** `lib/assistant/creation-craft-modules.ts` · id `restyle_densify_v1`  
**Playbook:** attaches to `creation_landing_v1` / `creation_newsletter_v1`

## When

User asks to restyle, densify, polish, or improve an **existing** page (not greenfield).

## Rules

1. Read tree + craft_debug first.
2. Prefer `apply_ops` / `set_prop` — **no** full-page `import_html` unless empty/seed or explicit rewrite.
3. Keep section order unless a wireframe module is also active.
4. Densify checklist: Fallgefühl, hero media, gaps, surfaces/grid, seed chrome out.

## Eval briefs

`de-restyle-06`, `en-restyle-07`, `de-restyle-27`, `en-restyle-28` in `creation-craft-eval.ts`.
