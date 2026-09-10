# Collection invite links

**Status:** Accepted · 2026-09-10  
**Layer:** Domain (PLEXON control plane)  
**Parent:** `specs/domain/collection-projects.md` · Access Model B  
**API:** `specs/api/collection-invites.md`

## Goal

Authenticated Plexon users in the **same company** can be invited to a Collection via a shareable link. Accepting the invite upserts `user_platform_project_assignments` so Access Model B visibility (and CREATION/VIDEON collaboration) works. No anonymous public edit.

## Invariants

1. **Collection-wide grant** — invite grants Collection membership (`member` or `admin`), not a scene-only ACL.
2. **Same company** — accept MUST fail if the invitee is not a `company_users` member of the Collection’s `companyId` (global Plexon admins MAY accept).
3. **Creator/admin create** — only users who pass `userCanManageCollectionLifecycle` MAY create or revoke invites.
4. **Token hygiene** — store only SHA-256 of the plain token; return plain token once on create.
5. **Fail closed** — expired, revoked, exhausted (`maxUses`), or unknown tokens → 404/410; foreign company → 403.
6. **Optional deep link** — invite MAY carry `sceneId` for post-accept redirect into CREATION editor; ACL remains Collection-based.

## Roles

| Role | Meaning |
|------|---------|
| `member` (default) | View + edit in products that use Access Model B for the Collection |
| `admin` | Same + Collection lifecycle / further invites |

## Flows

1. Owner/admin creates invite (`platformProjectId`, optional `sceneId`, `role`, TTL, `maxUses`).
2. System returns absolute Plexon URL `/invite/{token}`.
3. Invitee (signed in) opens URL → accept → upsert assignment → redirect to CREATION `/editor?sceneId=&platformProjectId=` when configured, else Collection launch URL.

## Non-goals

- Anonymous / public-edit tokens  
- Scene-scoped ACL tables  
- Cross-company invites  
- CRDT/OT editing (Presence remains as today)
