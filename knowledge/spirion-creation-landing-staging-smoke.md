# Spirion + Creation Landing — Staging Smoke

**Goal:** Verify assistant builds a marketing landing from **real Spirion capture craft** (prompt packs) with **density/rhythm**, not only palette/fonts or editorial templates; finish even if preview soft-fails. After the turn, inspect **craft-debug** in &lt;1 minute.

## Preflight

- [ ] plexon-v3 + creation-v3 health `commitSha` recent
- [ ] `SPIRION_MCP_URL` = `https://spirion-api.projects-a.plygrnd.tech/mcp` · Creation MCP + creation-web live
- [ ] Open Creation editor with a Collection scene (pageContext has scene)
- [ ] Spirion library has captures (`spirion_captures_list` non-empty)

## Prompt (copy)

```
Bau eine Marketing-Landing Page für „Urban Glide“ (Hero, Benefits, CTA).
1) spirion_captures_list (ohne Project-Filter) → 1–2 Homepages → capture_prompt_pack (both).
2) Erfinde ein eigenes Design-System (Hex + Font) — kein MSQDX-Orange/#ff6a3b, kein Noto-only, kein Near-black-Default.
3) Setze Pack-Dichte um: Type-Scale-Sprung, page_rhythm Band-Höhen, CTA-Chrome, avoid[].
4) Ein freistehendes HTML mit Literalen (kein var(--*), kein --site-*) → creation_scene_import_html mit pageName + craftMeta.spirion.
5) content_audit (craft-thin ernst nehmen) → preview.
```

## Expect

| Step | Pass |
|------|------|
| Spirion library | `spirion_captures_list` called; ≥1 capture → `spirion_capture_prompt_pack` (and/or compose_brief) |
| Search | Optional; empty Collection search **OK** if packs used — must **not** jump straight to Editorial after one empty search |
| Design system | Invented palette/font (not Site-Kit orange/Noto defaults); **no** required `creation_brand_tokens_get` for free landings |
| Density | Hero has visual mass; varied section heights; type-scale jump visible; not three equal cards as whole page |
| Import | `creation_scene_import_html` with literale Hex; optional `craftMeta.spirion` |
| Content | No seed copy („Get started“, „Option A“, bare „Text“); no foreign brand headlines |
| Layout | No gray wireframe / tiny 320-placeholder hero |
| Audit | `creation_scene_content_audit` → `ok` or only warnings; `craft-thin` absent or fixed |
| Preview | `creation_scene_preview` attempted; on error/network → finish with audit only |
| toolTrace | Assistant message `metadata.toolTrace` has captures/import flags |
| Craft debug | With sceneId + pageId: `GET …/api/scenes/:id/craft-debug?pageId=` returns bundle (stats, craftFlags, spirion?) |
| Turn | Completes; cites capture id + palette + max hero px + grids |

## Fail

- Seed copy left on canvas
- Abort because search empty or „token missing“ **without** trying captures_list
- Finished look = pure Editorial fallback while captures existed
- Finished look = pure Site Kit fixture chrome / MSQDX orange+Noto default
- Wireframe-thin hero / equal padding stacks / ignored pack rhythm
- Network error / stream death at preview without soft-fail recovery
- Claims pixel QA when preview `error` set
- No craft-debug after import (bundle missing on page)

## Debug in &lt;1 min

1. Note sceneId (and pageId) from the turn / editor URL.
2. Fetch Creation `craft-debug` — compare `spirion` vs `designSystem` vs `sceneStats` vs `craftFlags`.
3. If thin: pack-ignore (flags without pack fields in HTML) vs thin HTML (`importSourceHtml` hash) vs import loss (HTML dense, sceneStats thin).

## Notes

Spirion staging corpus is mostly **homepages/landings**, not e-commerce PDPs — do not require PDP references.
Freie Agency-Landings: inventiertes System + Spirion-Dichte; Brandion active-pack optional, nicht blockierend.
