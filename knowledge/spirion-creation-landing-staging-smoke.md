# Spirion + Creation Landing — Staging Smoke

**Goal:** Verify assistant can build a marketing landing from Spirion homepage/landing inspiration (or empty corpus), without stalling on tokens, and finish even if preview soft-fails.

## Preflight

- [ ] plexon-v3 health `commitSha` recent
- [ ] `SPIRION_MCP_URL` set · Creation MCP + creation-web live
- [ ] Open Creation editor with a Collection scene (pageContext has scene)

## Prompt (copy)

```
Bau eine Marketing-Landing Page für „Urban Glide“ (Hero, Benefits, CTA, optional Varianten-Block).
Hol dir zuerst Spirion-Referenzen für Homepage / Landing, übernimm nur Struktur/Copy-Muster — keine 1:1-Fremdmarke.
Zuerst creation_brand_tokens_get — Pack-Tokens via set_token_binding auf CTA/Badge/Sections; set_style nur für Bildgröße.
```

## Expect

| Step | Pass |
|------|------|
| Spirion search | Called; **empty corpus OK** — user sees „Corpus leer → Best-Practice Editorial-Patterns (Linear / Verve / Superhuman)“; agent continues with structured import-html (header/hero/stats rows, 3-col benefits) |
| Brand pack | `creation_brand_tokens_get` called; `source` noted (brandion vs fixture) |
| Page | `add_page` (or clear section on active page) named for Urban Glide |
| Content | No seed copy („Get started“, „Option A“, bare „Text“) |
| Tokens | `set_token_binding` polish on key surfaces — **not** only Site Kit fixture defaults; if fixture pack, say so |
| Layout | No gray wireframe / tiny 320-placeholder hero |
| Audit | `creation_scene_content_audit` → `ok` or only warnings |
| Preview | `creation_scene_preview` attempted; on error/network → finish with audit only, no Vision claim |
| Turn | Completes with assistant text (no hanging „network error“) |

## Fail

- Seed copy left on canvas
- Abort because Spirion empty or „token missing“
- Finished look = pure Site Kit fixture chrome with no pack fetch / no binding polish
- Network error / stream death at preview without soft-fail recovery
- Claims pixel QA when preview `error` set

## Notes

Spirion staging corpus is mostly **homepages/landings**, not e-commerce PDPs — do not require PDP references.
Ohne Brandion active-pack für die Collection bleibt nur Fixture — Agent muss das sagen; individuelle Markenfarben brauchen Brandion-Pack.
