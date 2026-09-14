# METRON capability — Plexon

## Status
**Accepted (Wave 0)** — 2026-09-14. Binding/registry implementation = Phase 8 in `collection-projects.md` (planned until Wave 2).

## Identity
| Field | Value |
|-------|-------|
| Product id | `metron` |
| Display | METRON |
| Repo | `metron-v3` |
| Contract | `2026-05-plexon-federation-v3` |

## Role in the suite
METRON is the analysis/dashboard **capability** of a Collection: ingest (Excel/CSV first), semantic model, server KPIs, constrained dashboards — with provenance. Other products produce signals; METRON makes them comparable.

## Invariants
1. No second project type — users see Collections; METRON is a capability chip/binding.
2. Access Model B applies to all dashboard/dataset visibility.
3. Product data stays in metron-v3 — Plexon stores bindings + launch/summary only.
4. Upsert skipped while `NEXT_PUBLIC_METRON_URL` / `METRON_API_URL` unset (placeholder `pending`), same pattern as Brandion/Creation/Spirion early days.

## Target APIs (Wave 2)
- Origin: `POST /api/platform/provisioning/metron-project-origin`
- Upsert: `PUT {METRON}/api/platform/provisioning/projects/{platformProjectId}`
- Summary GET: same path with `X-Plexon-User-Id`
- Launch: `{METRON}/projects?platformProjectId={id}`

## Related
- `collection-projects.md` Phase 8
- `capability-catalog.md` — METRON set (Wave 9 agent-only)
- `assistant-metron-mcp.md`
- `knowledge/metron-v3-onboarding.md`
- `knowledge/metron-ecosystem-fit.md`
- Product SoT: `metron-v3/specs/domain/product-overview.md`
