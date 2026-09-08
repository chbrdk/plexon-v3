# VIDEON V7 — PLEXON pointer

**Date:** 2026-09-08  
**Upstream:** `specs/domain/videon-integration.md` § V7

Operator artifacts live in **videon-v3** (product owns media backup/retention/canary):

| Artifact | Path |
|----------|------|
| Domain acceptance | `videon-v3/specs/domain/v7-production-rollout.md` |
| Runbook | `videon-v3/knowledge/v7-production-runbook.md` |
| Legacy opt-in mapping | `videon-v3/knowledge/legacy-migration-opt-in.md` |
| Staging evidence | `videon-v3/knowledge/v7-staging-exercise-log.md` |
| Flow / catalog (V6) | `knowledge/collection-flow-videon.md` |

PLEXON responsibilities during V7 canary:

- Bind VIDEON only for allowlisted Collections (Access Model B).
- Show degraded/unavailable when VIDEON federation health fails — other capabilities continue.
- Do not force-enable `CAPABILITY_CATALOG_RUNTIME` as part of V7 unless separately signed.
