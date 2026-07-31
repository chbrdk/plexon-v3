# Collection projects — Phase 1 deferred

Phase 0 (spec + UX language) is done. **Do not** start create-path enforcement until product explicitly accepts Phase 1.

## When Phase 1 starts

Enforce Collection + both product mirrors on create:

- `lib/assistant/create-project-scope.ts` — drop `audion` / `checkion` create targets (or map to Collection + both)
- Admin company project create + sync — always both products
- `audion-project-origin` — end state Collection with AUDION bound and CHECKION synced
- Insights — new cards require real `platformProjectId`

See `specs/domain/collection-projects.md` Deferred table.
