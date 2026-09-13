# Print report primitives — Plexon agent playbooks (Phase E)

**Status:** Implemented 2026-09-13 (with Creation A–D consume)  
**Upstream:** `msqdx-ui/specs/domain/msqdx-ui-print-report-primitives.md` · `creation-v3/specs/domain/print-report-primitives-consume.md`

## Playbook edits (shipped)

Files: `lib/assistant/creation-craft-playbooks.ts` · `knowledge/creation-craft-playbooks.md`

| Playbook | Guidance |
|----------|----------|
| `creation_print_magazine_v1` | Chip tones · Callout for wash · Steps for linear process · no SiteStack/SVG diagrams in PrintPage |
| `creation_print_report_v1` | Same + `columnAlign` trailing `right` for numeric/EUR · prefer Ledger/Table over HTML |

## Eval fixture

`lib/assistant/creation-craft-eval.ts` brief `de-report-p92-25` — print report with accent chips + right EUR column + emphasized step (resolves to `creation_print_report_v1`).

## Operator quality loop

Creation checklist + golden fixture: `creation-v3/knowledge/print-report-quality-eval.md` · `creation-v3/apps/web/lib/magazine-pdf/p92-s5-fixture.ts`. Send canvas + Mag PNG + scene tree for S5 scoring.

## Write path (ops)

Plexon coerces stringified `ops` → array in `injectCreationSceneToolArgs` (`lib/assistant/creation-scene-tool-args.ts`). Creation MCP `creation.scene_apply_ops` also preprocesses string → array. Agents must still pass a native array when possible; documenting a tree without `apply_ops` is a failed turn.
