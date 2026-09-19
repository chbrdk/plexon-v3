# Creation Client Page Share (PLEXON)

**Status:** Accepted · 2026-09-19 · **Phase:** P5 (audit events + CSV export)  
**Product:** CREATION capability under Collection  
**Companion domain:** `creation-v3/specs/domain/client-page-share.md`  
**Eval:** `creation-v3/knowledge/client-page-share-eval.md` · `creation-v3/knowledge/client-page-share-p2.md`  
**Federation:** `2026-05-plexon-federation-v3`  
**Sibling (do not conflate):** `collection-invite-links.md` — member grant, same company only

## Goal

Define **enterprise ownership and policy** for CREATION client page shares so external stakeholders can view pages without Access Model B membership, while companies can restrict or forbid public links.

## Why Plexon owns policy

- Collection and company are Plexon SSOT.
- Adobe XD failure mode (links tied to departing designer’s cloud) MUST NOT repeat — shares are **Collection-scoped**.
- Org admins need a single place to set “no public client links” across products (Creation first; pattern reusable).

## Ownership model

| Concern | Owner |
|---------|-------|
| Token storage + page snapshot + viewer render | **CREATION** (Phase 1) |
| Who may mint / revoke (ACL) | Same as Collection lifecycle manage (`userCanManageCollectionLifecycle`) |
| Company / Collection share **policy** | **PLEXON** |
| Optional share registry / audit mirror | **PLEXON** (Phase 2 projection) |
| Collection member invites | Existing invite links — **unchanged** |

## Policy shape (indicative)

Stored on company defaults with optional Collection override under key **`clientShare`**:

```ts
type ClientSharePolicy = {
  enabled: boolean
  allowPublicLink: boolean // accessMode "link"
  requirePassword: boolean // if true, "link" forbidden
  maxTtlDays: number | null // null = no max beyond product default
  allowLiveHead: boolean // Phase 2 contentMode
  allowEmailAllowlist: boolean // Phase 2
}
```

Defaults for enterprise-leaning staging:

- `enabled: true`
- `allowPublicLink: false`
- `requirePassword: true`
- `maxTtlDays: 30`
- `allowLiveHead: true` (P2)
- `allowEmailAllowlist: true` (P2)

## API (Phase 2+)

| Route | Notes |
|-------|-------|
| `GET /api/platform/provisioning/collections/:id/client-share-policy` | Service + user; Creation BFF |
| `PATCH …/client-share-policy` | Collection lifecycle manage |
| `GET …/client-shares` | Registry projection (metadata only; no tokens) |
| `POST …/client-shares` | Creation service upsert projection |
| `DELETE …/client-shares/:shareId` | Lifecycle manage: mark projection revoked **and** fan-out `DELETE` to Creation token store |
| `POST …/client-share-events` | Creation service ingest (P5) |
| `GET …/client-share-events/export` | CSV audit export (P5) |

Phase 1 shipped Creation-local feature flags; P2 adds live policy + inventory; **P4** ships Collection UI + Creation revoke fan-out.

## Collection UI (Phase 4)

On Collection detail (`/projects/:id`), managers see **Client page shares**:

- Edit `clientShare` policy (enabled, public link, require password, max TTL, live head, email allowlist)
- List inventory projections (label, access/content mode, expiry, revoked)
- Revoke an active share (Plexon projection + Creation token)

Viewers may list; only lifecycle managers may PATCH policy or DELETE.

## Audit

Minimum events (Creation emits via service ingest; Plexon also records revoke on Collection DELETE):

- `client_share.created`
- `client_share.revoked`
- `client_share.viewed` (sampled / rate-limited)
- `client_share.unlock_failed` (rate-limited)

**P5 store:** `creation_client_share_events` (Collection-scoped, append-only, no tokens/passwords in `meta`).

**P5 export:** `GET …/collections/:id/client-share-events/export` → `text/csv` (view access; capped window).

Company-default policy merge remains deferred (Collection row or code defaults today).

## Invariants

1. Client share ≠ Collection assignment — no `user_platform_project_assignments` row for anonymous viewers.
2. Cross-company **edit** invites remain forbidden; client share is view-only and out-of-band.
3. Revoke is Collection-admin capable even if `created_by` user left.
4. Fail closed when policy `enabled: false`.

## Non-goals

- Hosting the interactive page renderer in Plexon (inventory links to Creation `/share/p/:token` only when plain token is known — Plexon never stores plain tokens)
- Replacing METRON/EQC share tokens (keep product-prefixed tokens)
- Public write into scenes

## Testing

- Spec file present; policy defaults documented  
- When implemented: unit tests for policy merge (company → Collection) and deny-by-default public link when `requirePassword`
