# Vaillant MaFo — Showcase-Lite Flows

**Status:** Accepted — 2026-09-02  
**SSOT templates:** `lib/collection-test-flow.ts` (`createVaillantBarrierResearchTemplate`, `createVaillantInstallerDualPerspectiveTemplate`)  
**Demo doc:** `knowledge/vaillant-group-mafo-demo.md`

## Goal

Flows on the Collection board must read as a **process story** for live demos — not a full research lab. Correct gate outcomes and long qualitative chains are secondary.

## Process beats (max 3)

1. **Wer?** — Zielgruppe + Persona (AUDION catalog IDs)
2. **Was?** — eine qualitative Frage am Touchpoint (AUDION journey)
3. **Stimmt’s?** — Page scan (CHECKION) + Brand measure (BRANDION) — linear, no fail branches

## UC1 · `vaillant-barrier-research-v1`

```
zielgruppe → persona → start → prompt → success → scan → guideline → brand_measure → quality_ok
```

- **MUSS** exactly one `prompt` (Barriere-Frage).
- **MUSS NOT** include `observe`, `message`, `measure`.
- **MUSS NOT** include score/issue `compare` gates or `abandon` nodes.
- **SOLLTE** ≤ 10 nodes total.

## UC2 · `vaillant-installer-dual-v1`

```
zg-endkunde → persona → start → prompt
  → zg-installer → persona → start → prompt → success
  → scan → guideline → brand_measure → quality_ok
```

- **MUSS** two zielgruppe + two persona + two start (dual perspective).
- **MUSS NOT** include score/issue gates or `abandon`.
- **SOLLTE** ≤ 14 nodes total.

## Bootstrap

Container bootstrap re-applies these templates (preserves `lastRun` / `lastVerdict`).

## Tests

- Node-count / forbidden-kind assertions in `__tests__/vaillant-group-mafo.test.ts`
- Dual start extraction still works for UC2
