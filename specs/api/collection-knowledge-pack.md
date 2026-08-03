# API — Collection Knowledge Pack

**Status:** Accepted (contract sketch) — 2026-08-03  
**Domain:** `specs/domain/collection-knowledge-pack.md`  
**Federation:** `2026-05-plexon-federation-v3`  
**Paths:** document route helpers in `lib/constants.ts` / `lib/shell-paths.ts` when implementing; canonical list in `knowledge/paths.md`

## Principles

1. Knowledge Pack endpoints are **separate** from Collection create/list and from product provisioning upsert.
2. Thin project upsert **must not** grow a `knowledge` / `facets` field.
3. Prefer **GET full pack** + **PATCH facet** over giant PUT for concurrent product publishers.
4. Service callers send `X-Plexon-Contract-Version` + `X-Service-Secret`; session callers use normal platform auth.

## Endpoints (PLEXON)

Base: Collection-scoped under platform projects.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/platform/projects/:platformProjectId/knowledge` | session \| service | Full pack (all facets + revision) |
| `GET` | `/api/platform/projects/:platformProjectId/knowledge/facets/:facetId` | session \| service | Single facet projection |
| `PUT` | `/api/platform/projects/:platformProjectId/knowledge` | admin session | Replace entire pack body (rare; admin import) — requires `If-Match: revision` |
| `PATCH` | `/api/platform/projects/:platformProjectId/knowledge/facets/:facetId` | admin session \| service | Merge/replace one facet |
| `POST` | `/api/platform/projects/:platformProjectId/knowledge/facets/:facetId/publish` | service | Product publish helper (validates product owns facet) |

Optional company-admin alias (same handlers):

- `/api/platform/companies/:companyId/platform-projects/:platformProjectId/knowledge…`

### Not endpoints

| Anti-pattern | Why |
|--------------|-----|
| `PUT /api/platform/provisioning/projects/:id` with pack | Upsert stays identity-only (`lib/platform-project-upsert.ts`) |
| Embedding pack in `GET …/dashboard` by default | Dashboard stays capability summary; knowledge is pull-on-use (optional `?include=knowledge` later) |
| Binary upload on these routes | `sources` = URL metadata only |

## Response shape (sketch)

```ts
type KnowledgePackResponse = {
  platformProjectId: string
  schemaVersion: '2026-08-knowledge-pack-v1'
  revision: number
  updatedAt: string
  updatedByUserId: string | null
  facets: {
    profile: FacetDocument<ProfileData>
    competitive: FacetDocument<CompetitiveData>
    research_brief: FacetDocument<ResearchBriefData>
    geo_context: FacetDocument<GeoContextData>
    brand: FacetDocument<BrandReservedData>  // status: 'reserved' until Brandion
    sources: FacetDocument<SourcesData>
  }
}
```

`FacetDocument` — see domain spec envelope.

Empty facets return envelope with empty `data` (and `brand.data.status === 'reserved'`).

## PATCH facet body

```json
{
  "mode": "replace" | "merge",
  "expectedRevision": 3,
  "provenance": {
    "actorType": "service",
    "productId": "checkion",
    "runId": "geo-…",
    "note": "post-geo publish"
  },
  "data": { }
}
```

| `mode` | Behaviour |
|--------|-----------|
| `replace` | Facet `data` replaced; revision++ |
| `merge` | Defined deep-merge per facet (e.g. union `competitors` by host, cap 25) |

Conflicts: `409` when `expectedRevision` mismatches.

### Facet ownership (service publish)

| Facet | Allowed `productId` on publish |
|-------|--------------------------------|
| `profile` | `plexon` (human); limited fields from `audion` / `checkion` with merge |
| `competitive` | `plexon`, `checkion`, `audion` (merge) |
| `research_brief` | `audion` (primary), `plexon` (human edit) |
| `geo_context` | `checkion` |
| `brand` | `brandion` only when active; others → `403` |
| `sources` | any authenticated publisher with URL allowlist rules |

## Relation to thin upsert

```ts
// lib/platform-project-upsert.ts — unchanged contract
type PlatformProjectUpsertPayload = {
  platformCompanyId: string
  name: string
  domain?: string | null
  status: 'active' | 'archived'
  ownerUserId: string
  contractVersion: string
  source: string
  requestedAt: string
}
```

Products needing shared brief call **GET knowledge** after resolving `platformProjectId` from binding — not via upsert response.

## Consumer pull patterns

| Consumer | When | Call |
|----------|------|------|
| CHECKION GEO suggest | User hits Suggest with Collection selected | `GET …/knowledge` or facets `profile`+`competitive`+`research_brief`+`geo_context` |
| CHECKION GEO create | Optional prefill competitors / queries | same |
| AUDION research start | Seed prompts from pack | `profile` + `competitive` + `geo_context` |
| AUDION after research | Publish distillate | `POST …/facets/research_brief/publish` |
| Assistant | Collection-pinned chat | GET pack (Phase 2+) |

## Errors

| Code | Meaning |
|------|---------|
| `404` | Unknown Collection |
| `403` | No assignment / wrong product for facet |
| `409` | Revision conflict |
| `422` | Unknown facet, reserved brand write, validation |
| `413` | Facet payload over size budget (enforce per-facet caps) |

## Size budgets (initial)

| Facet | Soft cap (serialized JSON) |
|-------|----------------------------|
| `profile` | 8 KiB |
| `competitive` | 16 KiB |
| `research_brief` | 64 KiB plain text total |
| `geo_context` | 32 KiB |
| `brand` | 16 KiB when active |
| `sources` | 32 KiB (≤ 100 items) |

## Implementation notes

- Lazy-create pack row on first GET.
- Index: unique `platform_project_id`.
- Do not sync pack through `syncPlatformProjectToProducts`.
- Document env/base URLs only via existing plexon constants; product clients use `NEXT_PLEXON_BASE_URL` / `PLEXON_API_BASE_URL`.
