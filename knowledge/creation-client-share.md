# Creation Client Page Share — Plexon notes

**Date:** 2026-09-19  
**Spec:** `specs/domain/creation-client-share.md`  
**Creation:** `../creation-v3/knowledge/client-page-share-eval.md` · P4 `../creation-v3/knowledge/client-page-share-p4.md`

Plexon owns **policy + Collection ownership** for CREATION client preview links. Creation owns token storage and the `/share/p/:token` viewer.

## P4 Collection UI

- Component: `components/projects/CollectionClientSharesPanel.tsx`
- Mount: Collection detail `PlatformProjectDashboard` (`/projects/:id`)
- Locale keys: `projects.detail.clientShares.*`
- Revoke: `DELETE …/client-shares/:shareId` marks projection **and** fans out to Creation `DELETE /api/platform/provisioning/collections/:id/client-shares/:shareId`

## P5 Audit

- Table: `creation_client_share_events` (migration `0018`)
- Ingest: `POST …/client-share-events`
- Export: `GET …/client-share-events/export` · panel button “Export audit CSV”

## P6 Company defaults

- Table: `company_client_share_policies` (migration `0019`)
- Admin UI: `CompanyClientSharePolicyPanel` on `/admin/companies/:id`
- Collection GET returns company→Collection restrictive merge; Collection PATCH may not loosen past company

Do not overload `collection_invites` for external clients.

