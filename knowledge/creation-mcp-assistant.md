# CREATION MCP ↔ Assistant

**Spec:** `specs/domain/assistant-creation-mcp.md`  
**Product MCP:** `creation-v3/mcp-server/` · port **3102**

| Env | Staging note |
|-----|----------------|
| `CREATION_MCP_URL` | Set after Coolify `creation-mcp` app exists — staging `https://j1pmt4en25da2yp40f4827d7.projects-a.plygrnd.tech` |

## Tools (v1 read)

`creation.health` · `creation.library_catalog` · `creation.compositions_list` · `creation.projects_list` · `creation.project_get`

## Tools (v2 scene)

`creation.scene_get` · `creation.scene_list` · `creation.scene_tree_index` · `creation.scene_content_audit` · `creation.scene_preview` · `creation.scene_craft_debug` · `creation.scene_import_html` · `creation.scene_apply_ops` · `creation.editor_palette` · `creation.brand_tokens_get` · `creation.site_kit_composition_save` · `creation.site_kit_page_save`

## Quality loop (2026-09-13)

- Prefetch (editor scene context): tree outline + palette types + compact craft-debug; optional Spirion `captures_list`.
- Parallel MCP reads when a round has no writes.
- After writes: orchestrator quality gate requires audit + craft-debug + preview before the turn may finish. `craft-thin` is a must-fix.
- **A1 visual must-fix:** seed/fixture chrome; landing jobs also require hero mass + CTA (outline Button/Link or audit `missing-cta`). Preview tool errors soft-skip; missing preview still blocks.
- Page→Pattern: `creation.site_kit_page_save` (persists bound scene). Op `bind_master_composition` is on the curated apply_ops allowlist.

Coordinator remains the only scene writer — no parallel layout subagents.

## Domain autonomy (“AGI-lite”)

Next wave after the quality loop: visual must-fix → craft playbooks → Collection craft memory → eval harness. Spec: `specs/domain/assistant-creation-agi-lite.md` · craft notes: `knowledge/assistant-creation-agi-lite.md`.
