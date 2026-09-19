# Assistant Access Model B — staging smoke (two users)

**Status:** Operator checklist — 2026-09-19  
**Depends:** `specs/domain/assistant-actor-identity.md` · Access Model B

## Preconditions

- Coolify plexon-v3: `AUDION_API_URL=https://audion-v3.projects-a.plygrnd.tech/api` (not FastAPI `audion-api:8000`)
- Two non-admin users in the same company: **User A** (Collection owner), **User B** (no assignment)
- Collection `C` owned by A only (no Team invite to B yet)

## Checks

1. **Directory** — As B, Collection `C` must not appear in accessible Collections / product project lists.  
2. **Assistant Collection chat** — As A, ask about `C` data (Checkion scans / Audion personas). Answers OK.  
3. **Assistant as B** — Open chat without `C` in context; ask for A’s project by name. Must not dump A’s RAG/roster.  
4. **Share then see** — A adds B via Collection Team (email or invite). B then sees `C` and can ask about it.  
5. **Revoke** — Remove B’s assignment; B loses list + assistant retrieval again.  
6. **Admin strict** — Global Plexon admin without membership on `C` must get Forbidden when binding `C` in Assistant (UI admin directory may still list all).

## Automated coverage (CI)

| Repo | Test |
|------|------|
| audion-v3 | `__tests__/target-groups-access-model-b.test.ts` · `__tests__/auth-api-token-actor.test.ts` |
| checkion-v3 | `__tests__/auth-api-token-actor.test.ts` · project-access tests |
| plexon-v3 | `__tests__/creation-scene-tool-args.test.ts` (actor inject) · platform-project-directory |

## Related

- Audion TG/knowledge routes gated via `lib/resource-access-http.ts`
- Hardening backlog note: `knowledge/assistant-actor-identity.md`
