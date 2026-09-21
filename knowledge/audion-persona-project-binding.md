# AUDION persona project binding (EQC)

Plexon Event Quick Check creates target groups via
`lib/integrations/audion-persona-bootstrap-client.ts`.

AUDION accepts both `projectId` (contracts) and `project_id` (snake_case).
Always send **both**; otherwise TGs/personas can be created without a project link.

Also always `upsert` the Collection → Audion binding after persona bootstrap
(`run-event-quick-check.ts` `bindAudionToPlatform`) so a stale binding cannot
point personas at the wrong Audion project.

@see audion-v3/knowledge/target-group-project-id-alias.md
