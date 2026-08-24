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
Pack-Tokens wo möglich, sonst Literale.
```

## Expect

| Step | Pass |
|------|------|
| Spirion search | Called; **empty corpus OK** — continues with best-practice landing |
| Page | `add_page` (or clear section on active page) named for Urban Glide |
| Content | No seed copy („Get started“, „Option A“, bare „Text“) |
| Tokens | Pack bindings and/or **named literals** (Hex/gap) — no stall |
| Audit | `creation_scene_content_audit` → `ok` or only warnings |
| Preview | `creation_scene_preview` attempted; on error/network → finish with audit only, no Vision claim |
| Turn | Completes with assistant text (no hanging „network error“) |

## Fail

- Seed copy left on canvas
- Abort because Spirion empty or „token missing“
- Network error / stream death at preview without soft-fail recovery
- Claims pixel QA when preview `error` set

## Notes

Spirion staging corpus is mostly **homepages/landings**, not e-commerce PDPs — do not require PDP references.
