# AUDION persona project binding (EQC)

Plexon Event Quick Check creates target groups via
`lib/integrations/audion-persona-bootstrap-client.ts`.

AUDION accepts both `projectId` (contracts) and `project_id` (snake_case).
Always send **both**; otherwise TGs/personas can be created without a project link.

Machine calls must send **`X-Plexon-User-Id`** (session actor) with `AUDION_API_TOKEN`.
Without the actor header Audion returns `401 {"error":"unauthorized"}` (Access Model B).
Use `buildAudionMachineHeaders(plexonUserId)` from `audion-connectivity.ts`.

Also always `upsert` the Collection → Audion binding after persona bootstrap
(`run-event-quick-check.ts` `bindAudionToPlatform`) so a stale binding cannot
point personas at the wrong Audion project.

@see audion-v3/knowledge/target-group-project-id-alias.md
@see specs/domain/assistant-actor-identity.md
