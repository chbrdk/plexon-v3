# Suite Cleanup — drop_safe Kurzliste (Gatekeeper)

**Stand:** 2026-09-26  
**Playbook:** [`suite-cleanup.md`](suite-cleanup.md)  
**Inventare:** jeweils `knowledge/cleanup-inventory.md` in den 9 Repos

## Aggregat

| Repo | drop_safe | reshape | defer / rebuild |
|---|---|---|---|
| plexon-v3 | 2a + glass-chat **done** | MUI/Board/Bridge | ClientRoom panel, lab-tile note |
| checkion-v3 | 2a **done** | fixtures | scoring/ops notes |
| audion-v3 | 2a **done** | fixture vs api | migrate script **keep**, Share-Links |
| brandion-v3 | 0–wenige | lucide dep | — |
| creation-v3 | 2a follow-ups **done** | Zaoly runtime | Zaoly editor (**not** purged) |
| videon-v3 | 2a CSS **done** | NLE hex CSS | PlatformAssistantHost |
| metron-v3 | **0** | — | deferred KPI docs (keep) |
| msqdx-ui | multi-bump **done** | bump chain, dual tokens | — |
| msqdx-echon | `deprecated/**` + `v2/**` **done** | — | — |

## Welle 2a — ausgeführt

Siehe Commit-Historie (plexon dead chrome, audion tmp/HTML dumps, checkion orphan ops notes, videon CSS, creation gitignore).

## Welle 2b — Freigabe „los“ 2026-09-26 — ausgeführt

| Item | Status |
|---|---|
| msqdx-echon `deprecated/**` | **done** (~304 files) |
| msqdx-echon `v2/**` + forecast CI + root v2 compose/symlinks | **done** (Coolify legacy app already exited; `echon-v3` healthy) |
| plexon glass-chat helpers + Tests | **done** |
| msqdx-ui `creation-layers-panel-multi-bump.md` | **done** |
| plexon MUI shim / Board / Bridge | **skipped** — bleibt reshape |
| audion migrate script + knowledge | **skipped** — keep (Migration nicht „complete“) |
| creation Zaoly runtime | **skipped** — Parity / defer |

## Checkbox Freigabe 2b

- [x] Owner: „los“ auf Welle 2b
- [x] Sweeper + Verifier pro Repo
- [x] `suite-stand.md` Cleanup-Abschnitt aktualisieren
