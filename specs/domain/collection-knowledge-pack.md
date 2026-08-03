# Collection Knowledge Pack — shared cross-product knowledge

**Status:** Accepted — implemented (v3) — 2026-08-03  
**Contract:** `2026-05-plexon-federation-v3` (extends with dedicated knowledge endpoints; does **not** enlarge thin project upsert)  
**Companions:**  
- API: `specs/api/collection-knowledge-pack.md`  
- Sync ops: `knowledge/collection-knowledge-sync.md`  
- AUDION publish: `audion-v3/specs/domain/knowledge-pack-publish.md`  
- CHECKION consume/publish: `checkion-v3/specs/domain/geo-knowledge-consume.md`  
- Collection model: `specs/domain/collection-projects.md`  
- Ownership: `knowledge/platform-surface-ownership.md`  
- Paths: `knowledge/paths.md` · index: `knowledge/specs-index.md`

## Goal

Collections accumulate **heterogeneous** knowledge over years: Audion research distillates, Checkion GEO/company context, later Brandion brand system refs. The **Collection Knowledge Pack** is the Plexon-owned, Collection-scoped source of truth for **shared** knowledge — structured as **facets**, not a kitchen-sink blob — so visual admin and federation stay scalable.

## Glossary

| Term | Meaning |
|------|---------|
| **Knowledge Pack** | One durable document per Collection (`platform_projects.id`), versioned, facet-partitioned. |
| **Facet** | Named, typed chapter/namespace of the pack (`profile`, `competitive`, …). Extensible without schema chaos. |
| **Identity** | Federated Collection fields already on `platform_projects` (`name`, `domain`, bindings, company). **Not** duplicated as pack body of record. |
| **Shared brief** | Cross-product consume surface: pack facets that any capability may pull. |
| **Product-local dossier** | Rich product store (Audion TipTap chapters, Checkion GEO jobs, Brandion guidelines). Remains product-owned; may **publish distillates** into facets. |
| **Distillate** | Bounded, typed projection published upward — never the full dossier dump. |
| **Provenance** | Who/what published a facet revision (actor, product, run id, timestamp, optional source URI). |

## Design principles

1. **Collection-scoped by default** for client work — not Tenant-Company as the default knowledge bucket. Company may later hold org-wide defaults; Collections hold engagement/client truth.
2. **Structure over blob** — facets / chapters / namespaces with typed fields; unknown facets are reserved slots, not freeform JSON bags.
3. **Three layers stay separate:**
   - **Identity** — `platform_projects` + bindings (federation upsert stays thin).
   - **Shared brief** — Knowledge Pack facets (this spec).
   - **Product-local dossiers** — Audion `knowledgeChapters`, Checkion GEO jobs / project competitors, Brandion guidelines — publish distillates only.
4. **Pull-on-use** for consumers (GEO suggest, Audion research / personas seed); **autosync distillates** from products after research / GEO complete (Re-sync CTA for dossier edits; never silent full-mirror of product dossiers).
5. **Version + provenance** on every write path that changes facet content.
6. **Magazine IA** in Plexon Collection detail — progressive disclosure, SoT vs capability-local labels, `@msqdx/ui` language (no purple AI landing chrome).

## Non-goals (explicit)

| Out of pack SoT | Why |
|-----------------|-----|
| Personas, target groups, journeys | Audion entities — stay product-local |
| Raw scan issues / GEO `queryRuns` | Checkion run payloads — stay product-local |
| Full TipTap / HTML research dumps | Too large, product-shaped; publish **section distillates** only |
| Binary brand assets / PDF blobs | Links + metadata only unless an existing blob store is adopted later |
| Inflating `PUT …/provisioning/projects/{id}` with the pack | Upsert remains identity + status (see API spec) |
| Fake Brandion content stubs | `brand` facet is **reserved** until Brandion federates |

## Ownership

| Concern | Owner |
|---------|-------|
| Pack CRUD, versioning, Collection Knowledge UI | **PLEXON** |
| Research dossier + publish distillates → `research_brief` | **AUDION** |
| GEO jobs + launch suggest; publish → `geo_context` / `competitive` | **CHECKION** |
| Guideline / tokens / voice (future) → `brand` | **BRANDION** (reserved) |
| Identity (`name`, `domain`, bindings) | **PLEXON** (already) |

Aligns with `knowledge/platform-surface-ownership.md`: cross-product shared brief = Plexon; deep dossiers stay product-local.

## Storage recommendation

### Decision: dedicated tables (not `platform_projects.metadata`)

| Option | Verdict |
|--------|---------|
| Stuff pack into `platform_projects.metadata` | **Reject** as SoT — unbounded growth, no facet-level concurrency, weak provenance, hard to version, pollutes thin project rows and sync payloads |
| Dedicated `collection_knowledge_packs` (+ optional `…_revisions` / facet rows) | **Accept** |

**Rationale:** Facets will grow independently (Audion publish vs GEO publish vs human edit). Partial PATCH, optimistic concurrency (`revision`), audit, and size isolation need first-class rows. Keep `metadata` for small operational flags only (e.g. feature toggles), never the pack body.

### Suggested schema (logical)

```
collection_knowledge_packs
  id                         text PK
  platform_project_id        text UNIQUE NOT NULL → platform_projects.id
  revision                   int NOT NULL DEFAULT 1
  schema_version             text NOT NULL  -- e.g. "2026-08-knowledge-pack-v1"
  facets                     jsonb NOT NULL  -- map facetId → FacetDocument
  updated_at                 timestamptz
  updated_by_user_id         text NULL

collection_knowledge_pack_events   -- append-only provenance (optional Phase 2)
  id, pack_id, facet_id, revision, actor_*, product_id?, run_id?, source_uri?, created_at, patch_summary
```

Phase 1 may store provenance **inside** each facet’s `provenance` object and add the events table when audit UI needs it.

## Facet taxonomy

Facets are **stable ids** (snake_case). New products register a facet in this spec before writing. Unknown facet keys in PUT are rejected unless `schema_version` bump registers them.

### 1. `profile`

| | |
|--|--|
| **Purpose** | Shared company/brand profile for launch forms, research seeds, assistant context |
| **Owner** | Plexon (human edit) + optional distillates from Audion Easy Setup / Checkion job targets |
| **Consume** | GEO suggest, Audion research start, Assistant Collection context |
| **Publish rules** | Human admin may edit freely. Products may PATCH only fields they own (e.g. Checkion may suggest `primaryDomain` from job target; never overwrite `displayName` without `merge: suggest`) |

**Fields (typed):**

| Field | Type | Notes |
|-------|------|-------|
| `displayName` | string | May mirror Collection `name` but pack may refine for brand voice |
| `legalName` | string \| null | Optional |
| `primaryDomain` | string \| null | Host-normalized; Identity `domain` remains federated SoT for bindings |
| `aliases` | string[] | Alternate brand strings |
| `markets` | string[] | Geo/market labels (free text controlled list later) |
| `industry` | string \| null | |
| `tagline` | string \| null | Short shared one-liner |
| `languages` | string[] | BCP-47-ish tags |

### 2. `competitive`

| | |
|--|--|
| **Purpose** | Shared rival set + category for GEO field, research framing, future Brandion competitive kits |
| **Owner** | Shared: human + Checkion publish; Audion may propose from research distillate |
| **Consume** | GEO launch (`competitors`), Audion research prompts |
| **Publish rules** | Checkion may upsert discovered/explicit hosts with provenance. Human merge wins on conflict unless product publish uses `mode: merge` (union hosts, cap documented) |

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `category` | string \| null | Market category label |
| `competitors` | CompetitorRef[] | `{ host, label?, source: 'human'\|'checkion'\|'audion', confidence? }` |
| `notes` | string \| null | Plain text, short |

### 3. `research_brief`

| | |
|--|--|
| **Purpose** | Cross-product distilled research (not TipTap SoT) |
| **Owner** | **AUDION** publish; Plexon humans may lightly edit |
| **Consume** | Checkion GEO suggest, Assistant, future Brandion tone checks |
| **Publish rules** | Audion publishes **sections** from research run / chapter distillate. Full HTML stays in Audion dossier. Re-publish replaces section set for that `sourceRunId` or merges by `sectionId` |

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `summary` | string \| null | Plain ≤ ~2k chars |
| `sections` | ResearchSection[] | `{ id, title, plainText, bullets? }` — **plain text**, not HTML |
| `topics` | string[] | Keywords / themes |
| `sourceRunId` | string \| null | Audion research run id |
| `sourceProjectId` | string \| null | Audion local project id |

### 4. `geo_context`

| | |
|--|--|
| **Purpose** | Findability / answer-engine context for re-launch and cross-product awareness |
| **Owner** | **CHECKION** |
| **Consume** | GEO suggest/create defaults; Audion may read themes for research framing |
| **Publish rules** | After completed GEO job (optional user confirm), publish query themes + rival hosts. Never publish full `queryRuns` |

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `queryThemes` | string[] | Clustered themes, not every prompt |
| `seedQueries` | string[] | Curated prompts worth reusing (cap e.g. 24) |
| `knownCompetitors` | string[] | Hosts (may sync into `competitive` via merge helper) |
| `targetHosts` | string[] | Hosts used in recent GEO |
| `lastGeoJobId` | string \| null | |
| `notes` | string \| null | |

### 5. `brand` (reserved)

| | |
|--|--|
| **Purpose** | Brandion tokens, voice, visual system **references** |
| **Owner** | Future **BRANDION** |
| **Consume** | Audion copy tone, Checkion creative QA (later) |
| **Publish rules** | Facet exists in taxonomy with `status: reserved`. GET returns `{ status: 'reserved', guidelineRef: null, … }` until Brandion onboarding. **No stub fake colors/fonts.** |

**Reserved field sketch (for future schema_version):**

| Field | Type | Notes |
|-------|------|-------|
| `status` | `'reserved' \| 'active'` | |
| `guidelineRef` | `{ product: 'brandion', guidelineId, version, url? } \| null` | Link, not dump |
| `voiceSummary` | string \| null | Distillate |
| `tokenRefs` | `{ kind: 'color'\|'font'\|'logo', name, externalId? }[]` | Metadata only |
| `activeGuidelineVersion` | string \| null | |

### 6. `sources`

| | |
|--|--|
| **Purpose** | Attachment / link registry for the pack (URLs, titles, mime) — not a blob store |
| **Owner** | Plexon + any product that publishes a link |
| **Consume** | Admin magazine “Sources”; products may resolve `sourceId` |
| **Publish rules** | Metadata only. Binary upload out of scope unless ecosystem adopts a shared object store |

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `items` | SourceItem[] | `{ id, title, url, kind: 'link'\|'doc'\|'asset-ref', mime?, addedByProduct?, addedAt }` |

## Facet document envelope

Every facet value is wrapped:

```ts
type FacetDocument<T> = {
  facetId: FacetId
  schemaVersion: string      // per-facet or pack-level; pack-level wins for Phase 1
  updatedAt: string          // ISO
  provenance: {
    actorType: 'user' | 'service' | 'system'
    actorUserId?: string | null
    productId?: 'plexon' | 'audion' | 'checkion' | 'brandion' | null
    runId?: string | null
    sourceUri?: string | null
    note?: string | null
  }
  data: T
}
```

Empty Collection → pack created lazily on first GET (all facets empty / `brand` reserved) or eagerly on Collection create (Phase 2).

## Plexon visual / IA (Collection Knowledge surface)

Surface lives on Collection detail `/projects/[id]` (`PlatformProjectDashboard`), magazine composition — dash-band shell, TOC, one facet tile at a time, structured `plexon-edit-dialog` editors. **Not** a separate purple “AI knowledge hub” landing.

### Composition (structure first)

1. **Masthead** — Collection name (Identity), domain chip, capability sync chips (existing).
2. **Knowledge band** — Display title e.g. “Collection knowledge” + revision meta; deck clarifies **Platform source of truth**.
3. **Header AI** — “Fill project with AI” drafts all suggestable facets (preview → merge apply).
4. **TOC** — facet jump links (uppercase hairline).
5. **Active facet tile** — kicker Shared, title, dek, read body, actions: AI suggest / Edit / product deep-links.
6. **Edit** — structured Field/Input dialog (not raw JSON). `sources` editable; `brand` reserved EmptyState.
7. **SoT vs local labels** — Pack facets badge **Shared**; deep links to Audion/Checkion remain capability-local.
8. **Empty states** — quiet magazine empty + AI suggest / manual edit CTAs. No fake Brandion copy.
9. **Growth** — TOC is primary nav; one active facet tile (not Accordion card chrome).

### Permissions sketch

| Role | Read pack | Edit `profile` / `competitive` / `sources` | Trigger product publish | Delete pack |
|------|-----------|--------------------------------------------|-------------------------|-------------|
| Collection member | yes | no (unless entitlement) | no | no |
| Collection admin / company admin | yes | yes | yes | soft-reset facets |
| Service (`X-Service-Secret`) | yes (scoped) | facet publish endpoints only | n/a | no |

Exact role mapping follows existing `user_platform_project_assignments` + Plexon admin roles (implementation phase).

## Federation behaviour

- **Thin upsert unchanged:** `PlatformProjectUpsertPayload` = company, name, domain, status, owner, contract, source, timestamps. **No pack body.**
- Products that need knowledge **GET** the pack (or a facet projection) when the user opens GEO suggest / research seed.
- Products **PATCH** specific facets via service auth with provenance.
- Identity fields: prefer `platform_projects.name` / `domain` for binding sync; pack `profile.displayName` / `primaryDomain` are editorial overlays — sync policy: optional “mirror identity → profile” on create only.

## Phasing

| Phase | Work | Status |
|-------|------|--------|
| **0** | Specs + indexes + ownership pointers (this doc) | **now** |
| **1** | Pack CRUD tables + GET/PATCH in plexon-v3; Collection Knowledge band (read + profile edit) | next |
| **2** | CHECKION GEO pull-on-use + optional publish to `geo_context` / `competitive` | after 1 |
| **3** | AUDION research distillate publish → `research_brief`; research seed consume | after 1 |
| **4** | Brandion facet activation (`brand` reserved → active) | when Brandion on v3 federation |

## Acceptance (spec phase)

1. Facet taxonomy and non-goals documented.
2. Dedicated storage recommended with rationale vs `metadata`.
3. API sketch exists and forbids upsert bloat.
4. Companion Audion/Checkion specs linked.
5. Collection-projects + ownership + paths + specs-index point here.

## Related Brandion shapes (future)

Brandion today models `BrandGuideline`, colors, fonts, organizations (see `brandion` repo). Pack stores **refs + short distillates**, never the full guideline graph — same rule as Audion TipTap / Checkion runs.
