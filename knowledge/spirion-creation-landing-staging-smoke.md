# Spirion + Creation Landing — Staging Smoke

**Goal:** Verify assistant builds a marketing landing from **real Spirion capture craft** (prompt packs), not only editorial templates; finish even if preview soft-fails.

## Preflight

- [ ] plexon-v3 health `commitSha` recent
- [ ] `SPIRION_MCP_URL` = `https://spirion-api.projects-a.plygrnd.tech/mcp` · Creation MCP + creation-web live
- [ ] Open Creation editor with a Collection scene (pageContext has scene)
- [ ] Spirion library has captures (`spirion_captures_list` non-empty)

## Prompt (copy)

```
Bau eine Marketing-Landing Page für „Urban Glide“ (Hero, Benefits, CTA, optional Varianten-Block).
Hol dir zuerst Spirion-Captures (captures_list → capture_prompt_pack), übernimm look_contract/page_rhythm — keine 1:1-Fremdmarke/Copy.
Zuerst creation_brand_tokens_get — Pack-Tokens via set_token_binding wo passend; sonst Literale aus dem Spirion-Pack; set_style nur für Bildgröße.
```

## Expect

| Step | Pass |
|------|------|
| Spirion library | `spirion_captures_list` called; ≥1 capture → `spirion_capture_prompt_pack` (and/or compose_brief) |
| Search | Optional; empty Collection search **OK** if packs used — must **not** jump straight to Editorial after one empty search |
| Brand pack | `creation_brand_tokens_get` called; `source` noted (brandion vs fixture) |
| Import | `creation_scene_import_html` reflects pack craft (measured colors/type/rhythm), not only Linear/Verve template |
| Content | No seed copy („Get started“, „Option A“, bare „Text“); no foreign brand headlines |
| Layout | No gray wireframe / tiny 320-placeholder hero |
| Audit | `creation_scene_content_audit` → `ok` or only warnings |
| Preview | `creation_scene_preview` attempted; on error/network → finish with audit only |
| Turn | Completes with assistant text; cites Spirion capture/pack when used |

## Fail

- Seed copy left on canvas
- Abort because search empty or „token missing“ **without** trying captures_list
- Finished look = pure Editorial fallback while captures existed
- Finished look = pure Site Kit fixture chrome with no pack fetch
- Network error / stream death at preview without soft-fail recovery
- Claims pixel QA when preview `error` set

## Notes

Spirion staging corpus is mostly **homepages/landings**, not e-commerce PDPs — do not require PDP references.
Ohne Brandion active-pack für die Collection bleibt Fixture + Spirion Literale — Agent muss das sagen.
