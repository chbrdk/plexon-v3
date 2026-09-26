# Suite Cleanup — drop_safe Kurzliste (Gatekeeper)

**Stand:** 2026-09-26  
**Playbook:** [`suite-cleanup.md`](suite-cleanup.md)  
**Inventare:** jeweils `knowledge/cleanup-inventory.md` in den 9 Repos

## Aggregat

| Repo | drop_safe | reshape | defer / rebuild |
|---|---|---|---|
| plexon-v3 | 6 | MUI/Board/Bridge | ClientRoom panel, lab-tile note |
| checkion-v3 | 5 | fixtures | scoring/ops notes, missing companion docs |
| audion-v3 | ~12 | fixture vs api | ueq-runs/, Share-Links |
| brandion-v3 | 0–wenige | lucide dep | Chromium crawl (not present) |
| creation-v3 | siehe Inventar | Zaoly runtime | Zaoly editor |
| videon-v3 | wenige docs | NLE hex CSS | PlatformAssistantHost |
| metron-v3 | **0** | — | deferred KPI docs (keep) |
| msqdx-ui | 1 conditional | bump chain, dual tokens | — |
| msqdx-echon | `deprecated/**` groups | — | **entire `v2/`** |

## Welle 2a — Freigabe durch Plan-Implementierung (unreferenziert, verifiziert)

Diese Zeilen dürfen der Sweeper **jetzt** löschen (Orchestrator hat Refs nochmals geprüft):

### plexon-v3
- `components/InfoTooltip.tsx`
- `components/Sidebar.tsx`
- `components/layout/PlexonPageChrome.tsx`
- `components/layout/PlexonAppHeaderV2.tsx`
- `components/assistant/AssistantSurfaceIconButton.tsx`
- `knowledge/magazine-button.md`
- `knowledge/magazine-lede.md`

### audion-v3
- `tmp/migrate-v2-v3/` (gesamter Ordner)
- `knowledge/ebm-comparison-2026-08-19.json`
- `knowledge/ebm-ai-concrete-results-2026-08-19.html`
- `knowledge/ebm-human-vs-ai-findings-2026-08-19.html`
- `knowledge/bsh-home-concrete-results-2026-08-19.html`
- `knowledge/bsh-human-vs-ai-2026-08-19.html`
- `knowledge/ueq-ebike-*-2026-08-19.html` (alle HTML-Reports dieser Welle)
- `knowledge/coolify-web-deploy-fail-copy-next-2026-08-03.md`
- `knowledge/knowledge-sync-after-bind-2026-08-03.md`

### checkion-v3
- `knowledge/magazine-button.md`
- `knowledge/magazine-lede-filter.md`
- `knowledge/coolify-build-fix-2026-08-11-chatoverlay.md`
- `knowledge/coolify-build-fix-2026-09-17-labtile.md`
- `knowledge/sefe-staging-reset-2026-09-21.md`

## Welle 2b — braucht explizites „los“

| Item | Warum Gate |
|---|---|
| msqdx-echon `deprecated/**` (~290 Dateien) | Knowledge-Salvage prüfen |
| msqdx-echon `v2/**` | CI forecast workflow + ops docs |
| plexon MUI shim / Board / Bridge | reshape zuerst |
| plexon glass-chat helpers + Tests | Tests mitlöschen |
| audion migrate script + knowledge doc | Script behalten oder beides droppen |
| msqdx-ui creation-*-bump chain | Consolidate first |
| creation Zaoly runtime | Parity |

## Checkbox Freigabe 2b

- [ ] Owner: „los“ auf Welle 2b (oder genannte Zeilen)
- [ ] Sweeper + Verifier pro Repo
- [ ] `suite-stand.md` Cleanup-Abschnitt aktualisieren
