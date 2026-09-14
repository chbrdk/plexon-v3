# Creation craft — next scenarios (playbook granularity)

**Date:** 2026-09-14  
**Status:** Recommendation · Spec pointer `specs/domain/assistant-creation-agi-lite.md` § Wave B  
**Today’s catalog:** 5 format playbooks (`landing` · `newsletter` · `print magazine` · `print report` · `page-as-pattern`)

## Verdict

**Do not** explode into 20 full playbooks. Keep **format** playbooks (quality job + finish rules) and add **kleinteilige Craft-Module** that compose in (like Wireframe-Vertrag + Fallgefühl already do inside landing).

Industry pattern 2026: progressive disclosure — load only the module that matches the turn, don’t stuff every recipe into every landing turn.

## Keep as full playbooks (format = quality job)

| Playbook | Why it stays top-level |
|----------|------------------------|
| Landing / Newsletter / Print* / Pattern | Different node palette, width, tokens, gate job |

## Shipped modules (code)

| Id | File |
|----|------|
| `spirion_section_ref_v1` | `lib/assistant/creation-craft-modules.ts` (always landing/newsletter) |
| `restyle_densify_v1` | same |
| `wireframe_layout_v1` | same |
| `nav_chrome_v1` | same |
| `stats_metrics_v1` | same |
| `pdp_detail_v1` | same |
| `social_proof_row_v1` | same |
| `faq_accordion_v1` | same |
| `feature_bento_v1` | same |
| `pricing_compare_v1` | same |
| `contact_strip_v1` | same |

Compose: `resolveCreationCraftModules` → `buildCreationSceneDepthPromptBlock({ userPrompt, playbookId })`.

## Remaining modules (not new quality jobs) — priority

| Module | Trigger | Why |
|--------|---------|-----|
| **Spirion section ref (meta)** | Always landing/newsletter | **Shipped** — `spirion_section_ref_v1` |
| **Restyle / densify existing** | Restyle, dichter, polish | **Shipped** — `restyle_densify_v1` |
| **Wireframe → layout contract** | Skizze / Bioframe | **Shipped** — `wireframe_layout_v1` |
| **Nav / header chrome** | Nav, Header, Menü | **Shipped** — `nav_chrome_v1` |
| **Stats / metrics strip** | Stats, KPI, Zahlenband | **Shipped** — `stats_metrics_v1` |
| **PDP / product detail** | PDP, Produktdetail | **Shipped** — `pdp_detail_v1` |
| **Social proof / logo row** | Happy Customers, logos, trust | **Shipped** — `social_proof_row_v1` |
| **FAQ / accordion** | FAQ, Fragen | **Shipped** — `faq_accordion_v1` |
| **Feature bento** | Bento, Vorteile, Feature grid | **Shipped** — `feature_bento_v1` |
| **Pricing / comparison** | Preise, Pricing table | **Shipped** — `pricing_compare_v1` |
| **Form / contact strip** | Contact us, Demo anfragen | **Shipped** — `contact_strip_v1` |
| **Brandion-bound restyle** | Collection has active pack | Literals → token bind optional second pass |
| **Print chapter rhythm** | Magazin multi-page | Cover → chapter → folio (module under print playbook) |

## Spirion-backed section modules (next)

See **`knowledge/creation-craft-spirion-section-modules.md`**.

Priority: testimonial / blog → Brandion bind / print chapter.

## Maybe later (full playbook only if gate differs)

- **App shell / dashboard UI** in Creation (not marketing landing) — different density rules  
- **Multi-breakpoint set** (Desktop+Mobile as intentional pair)  
- **Motion / interaction** scenes — only when scene interactions are first-class in agent tools  

## What “kleinteiliger” means here

1. **Catalog row** = short name + trigger regex + 15–40 lines procedure.  
2. **Compose:** `landing_v1` + matched modules (max 2–3 per turn).  
3. **Eval brief** per module (DE/EN) before prompt thrash.  
4. **Gate findings** stay format-level; modules add soft craft flags when measurable.

## Anti-pattern

New top-level playbook for every layout (Company Profile, Happy Customers, …) → resolver thrash + diluted context. Encode those as modules + one example ref image under `knowledge/refs/`.
