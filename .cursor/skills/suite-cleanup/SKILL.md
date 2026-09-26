---
name: suite-cleanup
description: >-
  Runs the MSQDX suite cleanup agent network (Inventor, Gatekeeper, Sweeper,
  Verifier) across plexon and product repos. Use when the user asks to clean up
  legacy leftovers, drop dead knowledge/assets, suite aufräumen, cleanup
  inventory, drop_safe, or keep-drop backlog updates without breaking live
  features.
---

# Suite Cleanup

## When to use

- „Suite aufräumen“, „alte Überbleibsel“, „cleanup inventory“, `drop_safe`
- Keep/Drop aktualisieren, orphan Knowledge/Assets entfernen

## Read first

1. `plexon-v3/knowledge/suite-cleanup.md` — Regeln + Verbote  
2. `plexon-v3/knowledge/suite-stand.md` — Checkpoint  
3. Local `knowledge/keep-drop-backlog.md` + `knowledge/cleanup-inventory.md`

## Roles

### Inventor (default first step)

- One repo only; **read-only** (write only `cleanup-inventory.md`).
- Every row needs a class: `keep` | `reshape` | `drop_safe` | `drop_needs_rebuild` | `defer`.
- Prefer **keep** when unsure.

### Gatekeeper

- Merge inventories → update keep-drop + `plexon-v3/knowledge/suite-cleanup-drop-safe.md`.
- Do not delete.

### Sweeper

- Only paths listed as `drop_safe` **and** user said „los“ on that list (or named rows).
- Specs first if a spec file is removed; never silent-delete Live APIs.

### Verifier

- Run Vitest / specs-inventory / relevant smoke for touched repos.
- Update `suite-stand.md` Cleanup section on success.

## Parallelism

Launch one Inventor Task per repo (9 workers). After all inventories exist, one Gatekeeper pass. Sweepers are **serial per repo** (no big-bang multi-repo delete commit).

## Hard bans

- Do not expand or casually delete `mui-shim` / Board without reshape plan.
- Do not purge Echon `v2/` or Creation Zaoly runtime without explicit inventory approval.
- Do not remove fixtures referenced by tests.
