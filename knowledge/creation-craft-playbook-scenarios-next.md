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
| `restyle_densify_v1` | `lib/assistant/creation-craft-modules.ts` |
| `wireframe_layout_v1` | same |

Compose: `resolveCreationCraftModules` → `buildCreationSceneDepthPromptBlock({ userPrompt, playbookId })`.

## Remaining modules (not new quality jobs) — priority

| Module | Trigger | Why |
|--------|---------|-----|
| **Restyle / densify existing** | Restyle, dichter, polish | **Shipped 2026-09-14** — module `restyle_densify_v1` |
| **Wireframe → layout contract** | Skizze / Bioframe / attachment | **Shipped** — module `wireframe_layout_v1` + landing § |
| **PDP / product detail** | PDP, Produktdetail | Same gate as landing, different section map (gallery, specs, buy) |
| **Pricing / comparison** | Preise, Pricing table | Grid + CTAs; char discipline |
| **Social proof / logo row** | Happy Customers, logos, trust | 4-up icon/logo pattern from wireframe |
| **Form / contact strip** | Contact us, Demo anfragen | Input+button row; catchy title |
| **Brandion-bound restyle** | Collection has active pack | Literals → token bind optional second pass |
| **Print chapter rhythm** | Magazin multi-page | Cover → chapter → folio (module under print playbook) |

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
