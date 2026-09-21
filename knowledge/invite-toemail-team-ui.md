# Invite `toEmail` from Team UI

**Status:** 2026-09-21  
**Spec:** `specs/domain/transactional-email.md` · `specs/api/collection-invites.md`

## UX

Capability Team panels (Audion, Checkion, Brandion, Creation, Metron, Videon):

1. **Add member** — draft email → `POST …/members` (Plexon sends `collection_member_added` when `added`).
2. **Invite link** — if the draft email is non-empty, BFF forwards `toEmail` → Plexon mints + best-effort `collection_invite` mail; UI shows `emailedTo` status. If draft empty → mint + clipboard copy (unchanged).
3. Invite click sets `skipBlurSave` so blur does not commit Add before the invite reads the draft.
4. On `user_not_found` / `wrong_company` for Add, keep the draft so the operator can click Invite.

## Paths

| App | BFF invite | Client |
|-----|------------|--------|
| Audion / Checkion / Brandion / Creation / Metron | `/api/projects/:id/invites` | `createCollectionInviteOnPlexon({ toEmail })` |
| Videon | `/api/collections/:id/invites` | same |

No app SMTP — mail stays on Plexon.
