# Creation domain autonomy (“AGI-lite”)

**Spec:** `specs/domain/assistant-creation-agi-lite.md`  
**Baseline quality loop:** `specs/domain/assistant-creation-mcp.md` · `knowledge/creation-mcp-assistant.md`  
**Memory transport:** `specs/domain/collection-memory-wave1.md` (extend `research_brief` sections — do not invent a chat dump)

## What this is

Product path to **repeatable Creation autonomy** (landing + page-as-pattern), not general intelligence.

Stack: **verify → playbook → Collection craft memory → eval + budget routing**.

## Wave cheat sheet

| Wave | Outcome | Primary code (planned) |
|------|---------|------------------------|
| A1 | Deterministic visual must-fix beyond `craft-thin` | `lib/assistant/creation-scene-quality.ts` (**shipped**) |
| A2 | Structured Vision checklist in QA nudge | orchestrator Vision path |
| B | Playbooks `creation_landing_v1` / `creation_newsletter_v1` / `creation_print_*` / page-as-pattern | `lib/assistant/creation-craft-playbooks.ts` (**shipped**) |
| C | Pack sections `creation-craft-prefs-latest` · `creation-landing-recipe-latest` | knowledge-pack distill + hydrate |
| D | Fixture eval harness + low/mid/high tier | `__tests__` + optional staging runner |

## Locked constraints

- One scene writer (coordinator). Critic never writes.
- Scope-before-memory on `platformProjectId`.
- No Managed Agents multi-writer swarm.
- Paths/FQDNs only via `knowledge/paths.md` / constants.

## Staging smoke (after A1+)

1. Bound Collection + open Creation scene.
2. Ask for a landing; confirm turn does not finish on seed chrome.
3. “Seite als Pattern speichern” → MCP `creation.site_kit_page_save` + clean craft-debug.
4. Plexon health: `GET https://plexon-v3.projects-a.plygrnd.tech/api/health` → `deployment.commitSha`.

## Related research posture (2026)

Prefer **scoped, tiered memory** (eligibility → small craft shard → procedure) over monolithic retrieval. See wave spec § Architecture principles.
