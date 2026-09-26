# Suite Cleanup — Playbook

**Stand:** 2026-09-26  
**Checkpoint:** [`suite-stand.md`](suite-stand.md)  
**Skill:** `.cursor/skills/suite-cleanup/SKILL.md`  
**Zweck:** Konsequentes Aufräumen alter Überbleibsel **ohne** Live-Funktionen zu zerstören.

## Agentennetz

| Rolle | Wann | Output |
|---|---|---|
| **Inventor** (read-only) | Pro Repo | `knowledge/cleanup-inventory.md` |
| **Gatekeeper** | Nach Inventur | Klassen in `keep-drop-backlog.md` + Kurzliste `drop_safe` |
| **Sweeper** | Nur nach Freigabe der Kurzliste | Löschen + Spec/Keep-Drop-Notiz |
| **Verifier** | Nach Sweeper | Vitest / specs-inventory / betroffene Smoke |

Orchestrator startet **einen Inventor pro Repo** parallel, dann einen Gatekeeper-Pass über alle Inventare.

## Klassen

| Klasse | Bedeutung | Löschen? |
|---|---|---|
| `keep` | Live / Spec / Tests brauchen es | Nein |
| `reshape` | Muss ersetzt werden, bevor Drop (z. B. MUI-Board) | Nein (eigene Welle) |
| `drop_safe` | Unreferenziert **oder** Keep-Drop sagt Drop **und** Nachweis | Ja (Welle 2) |
| `drop_needs_rebuild` | Drop geplant, aber noch Import/Runtime | Nein bis Rebuild |
| `defer` | Bewusst später (z. B. Echon `v2/`, Kundenraum-UX) | Nein |

## Harte Verbote

- Keine Massenlöschung ohne Inventarzeile + Klasse.
- Specs/Knowledge mit Live-Bezug: erst „Dropped“-Notiz oder Keep-Drop-Zeile.
- Fixtures mit Test-Refs: keep bis Tests umgebaut.
- Live-APIs (ClientRoom, Share-Links, Federation): nicht löschen.
- `lib/mui-shim.tsx` / Board `@msqdx/react`: nur `reshape`.
- Creation Zaoly-Editor / Echon `v2/`: nur nach expliziter Freigabe der Inventarliste.

## Nachweis „unreferenziert“

Vor `drop_safe` mindestens eines:

1. Repo-weite Suche: keine Imports / Pfad-Strings / Route-Refs.
2. Nicht in `specs-inventory` / Playwright / `paths.ts` Needles.
3. Keep-Drop-Zeile „Drop“ + Datei ist nur Doc/Asset ohne Code-Import.

## Inventar-Format (`knowledge/cleanup-inventory.md`)

```md
# Cleanup inventory — <repo>
**Date:** YYYY-MM-DD
**Inventor:** <agent|human>

| Path | Klasse | Nachweis | Notes |
|---|---|---|---|
| `…` | drop_safe \| reshape \| keep \| defer | no imports / keep-drop Drop | … |
```

## Freigabe-Gate

Kurzliste `drop_safe` steht in [`suite-cleanup-drop-safe.md`](suite-cleanup-drop-safe.md).  
Sweeper startet **nur** nach explizitem „los“ auf diese Liste (oder Zeilen davon).

## Repos im Netz

plexon-v3 · checkion-v3 · audion-v3 · brandion-v3 · creation-v3 · videon-v3 · metron-v3 · msqdx-ui · msqdx-echon

## Inventor-Prompt (kopieren)

```
Repo: <abs-path>
Read knowledge/suite-cleanup.md (plexon) and local keep-drop-backlog.md if any.
Produce knowledge/cleanup-inventory.md in THIS repo only.
Classify every candidate path. Do NOT delete. Prefer false keep over false drop_safe.
Focus: legacy shims, deprecated/, tmp/, orphan knowledge/assets, keep-drop Drop rows vs code.
```
