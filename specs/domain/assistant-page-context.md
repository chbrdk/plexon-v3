# Assistant page context

**Status:** Accepted — 2026-08-10 · **Suite-wide extension** — 2026-09-29  
**Implements:** `lib/assistant/page-context/` · `components/assistant/AssistantPageContext.tsx` · hydrate EQC / CREATION / METRON · complete body `pageContext`  
**API:** `specs/api/assistant-embed.md` (`assistant:context` + complete payload)  
**Flyout:** `specs/domain/central-assistant-flyout.md`  
**Rollout checklist:** `knowledge/assistant-page-context-rollout.md`  
**Knowledge:** `knowledge/central-assistant-flyout.md` · `knowledge/paths.md`  
**Collection model:** `specs/domain/collection-projects.md`

## Goal

From **every** suite app, on **every** relevant surface, the platform Assistant MUST know:

1. which **Collection** (`platformProjectId`) the user is in,
2. which **entity** is on screen (“dieser Scan”, “diese Persona”, “dieses Guideline”),
3. enough to **inject tool args** and optionally **hydrate** a compact system-prompt block —

so deixis works without re-pasting URLs or asking “Welches Projekt?”.

Absolute requirement: unified cross-app talk with automatic page context. Gold pattern today: CREATION editor (+ Plexon EQC / Collection hubs). Product FAB hosts that only pass theme are **incomplete**.

## Principles (non-negotiable)

1. **One Collection truth.** `platformProjectId` is the only project id the Assistant treats as “the project”. Product-local ids (Checkion project, Audion project, Brandion guideline, …) are **bindings or entities**, never a substitute for the Collection.
2. **Host publishes, Plexon consumes.** Each AppShell delivers context; the orchestrator resolves bindings + tools. No second chat backend.
3. **Three layers:**
   - **Collection** — always when known on a Collection-bound surface
   - **Entity** — the thing on the page (`scan`, `persona`, `guideline`, …)
   - **Hydrate** — optional compact system-prompt block (EQC pattern); never dump full payloads
4. **Deixis without re-ask.** “dieser Scan”, “die Personas hier”, “dieses Projekt” → inject tool args from context. When `platformProjectId` is set, the Assistant MUST NOT ask which Collection/project to use.
5. **Fail closed.** Unknown / unauthorized entities → thin route hint only; no data leak.
6. **Anti-pattern.** Never treat a product-local `/projects/{localId}` path segment as `platformProjectId`. Use the Collection field on the loaded row, a publish hook, or `?platformProjectId=`.

## Payload

```ts
type AssistantPageContext = {
  product:
    | 'plexon'
    | 'audion'
    | 'checkion'
    | 'brandion'
    | 'creation'
    | 'metron'
    | 'videon'
    | 'echon'
    | 'spirion'
  pathname: string
  capability?: string // e.g. ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK, creation_editor, …
  platformProjectId?: string // Collection — REQUIRED on Collection-bound surfaces
  platformCompanyId?: string
  entityType?: string // registry below; constants in page-context module
  entityId?: string // scan / persona / scene / dashboard / … id
  entityUpdatedAt?: string // optimistic-lock token (e.g. CREATION scene_apply_ops)
  /**
   * Optional product-local hints for tool-arg inject only.
   * MUST NOT be dumped into the system prompt.
   * Examples: { audionProjectId, checkionProjectId, guidelineId }
   * Wave 3+ — hosts MAY omit when Plexon can heal bindings from platformProjectId alone.
   */
  entityMeta?: Record<string, string>
}
```

Constants: `lib/assistant/page-context/` (capability / entityType ids). Never hardcode capability or entityType strings in call sites.

`parseAssistantPageContext` validates shape and ignores unknown fields. `entityMeta` values MUST be short non-empty strings (cap per key/value in implementation); strip on parse overflow.

## Entity registry

| product | entityType constant / value | Typical surface | Required context |
|---------|-----------------------------|-----------------|------------------|
| plexon | `event_quick_check_run` | `/event-quick-check?run=` | `platformProjectId` when run is Collection-bound |
| plexon | _(Collection hub)_ | `/projects/{platformProjectId}/…` | `platformProjectId` from path |
| checkion | `domain_scan` | Scan result Overview/Issues/… | `platformProjectId` + `entityId` = domain scan id |
| checkion | `page_scan` | Page-scan detail | `platformProjectId` + page scan id |
| checkion | `geo_job` | GEO job detail | `platformProjectId` + geo job id |
| audion | `persona` | Persona detail | `platformProjectId` (+ meta `audionProjectId` if needed) |
| audion | `target_group` | TG detail | same |
| audion | `journey` | Journey detail | same |
| audion | `study` | Study detail | same |
| brandion | `guideline` | Guideline studio | `platformProjectId` |
| brandion | `token_set` | Token / pack surface | `platformProjectId` |
| creation | `composition_scene` | `/editor` | `platformProjectId` + scene id + lock token |
| metron | `dashboard` / `kpi` / `dataset` | Dashboard / focus surfaces | `platformProjectId` when Collection-bound |
| videon | `media` / `cut` / `analysis` | Library / editor | `platformProjectId` |
| spirion | _(product-specific)_ | TBD with Spirion MCP wave | Collection when bound |

New entity types: add constant in `lib/assistant/page-context/`, document here, add host publish + (optional) hydrate + tool-inject map before shipping.

### Existing constants (shipped)

| Constant | Value |
|----------|--------|
| `ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK` | `event_quick_check` |
| `ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN` | `event_quick_check_run` |
| `ASSISTANT_CAPABILITY_CREATION_EDITOR` | `creation_editor` |
| `ASSISTANT_ENTITY_COMPOSITION_SCENE` | `composition_scene` |
| `ASSISTANT_ENTITY_METRON_DASHBOARD` | `dashboard` |
| `ASSISTANT_ENTITY_METRON_KPI` | `kpi` |
| `ASSISTANT_ENTITY_METRON_DATASET` | `dataset` |
| `ASSISTANT_ENTITY_DOMAIN_SCAN` | `domain_scan` |
| `ASSISTANT_ENTITY_PAGE_SCAN` | `page_scan` |
| `ASSISTANT_ENTITY_GEO_JOB` | `geo_job` |
| `ASSISTANT_ENTITY_PERSONA` | `persona` |
| `ASSISTANT_ENTITY_TARGET_GROUP` | `target_group` |
| `ASSISTANT_ENTITY_JOURNEY` | `journey` |
| `ASSISTANT_ENTITY_STUDY` | `study` |
| `ASSISTANT_ENTITY_GUIDELINE` | `guideline` |
| `ASSISTANT_ENTITY_TOKEN_SET` | `token_set` |
| `ASSISTANT_ENTITY_VIDEON_MEDIA` | `media` |
| `ASSISTANT_ENTITY_VIDEON_CUT` | `cut` |
| `ASSISTANT_ENTITY_VIDEON_ANALYSIS` | `analysis` |

### Planned constants

_(none — Wave 2+/4 constants shipped above)_

## Wiring model (every app)

```
AppShell
  └─ AssistantPageContextProvider   // React publish bus
       ├─ Pages: useSetAssistantPageContext / usePublish…({ Collection + entity })
       └─ PlatformAssistantHost
            ├─ Embed URL bootstrap: product + project + pathname + entityType/Id
            │     (freeze src while open — no remount on entityUpdatedAt / conversation)
            └─ Live: postMessage assistant:context on open, on ready, on context change
                 └─ Plexon /assistant/embed → AssistantChat → complete body.pageContext
                      ├─ Authz + Collection membership
                      ├─ Binding heal (audion/checkion/… mirrors)
                      ├─ System prompt: thin Seitenkontext (+ optional hydrate)
                      └─ Tool-arg inject from Collection / entity / entityMeta
```

**Gold standard:** creation-v3 (`AssistantPageContextProvider` + editor publish + live `assistant:context`).  
**Suite hosts (Wave 1–4):** checkion / audion / brandion / metron / videon / echon — Provider + Collection publish + live `assistant:context` + entity on detail surfaces.  
**Plexon native:** publish + URL derive for EQC / `/projects/{id}`.
## Host duties (MUST)

Every product `PlatformAssistantHost` MUST:

1. Accept `platformProjectId` (and optional `capability`) **or** read them from the published page context.
2. AppShell / route layouts MUST pass Collection id into the host when the loaded resource has `project.platformProjectId` (or equivalent).
3. Bootstrap embed query with `product`, `project` (`platformProjectId`), `pathname`, and when known `entityType` / `entityId` / `capability` / `theme`.
4. While open: post `assistant:context` on context change **and** on `assistant:ready` (iframe may miss the first post).
5. Freeze `iframe.src` while open — lock-token / conversation / theme churn goes via postMessage only (`assistant-embed.md` § Iframe stability).
6. Detail surfaces MUST publish entity context (not only hubs).
7. Tests: complete/embed payload includes `platformProjectId` + `entityId` on the target surface (shell/contract smoke).

Shared helper shape (per repo, same semantics as creation-v3 `postPlatformAssistantContext` / `mergeAssistantHostPageContext`).

## Publishing (Plexon native)

1. React context provider wraps AppShell content.
2. Pages publish via `useSetAssistantPageContext` (EQC: `workflowRunId` + `platformProjectId`).
3. `PlatformAssistantHost` merges React context with URL fallback (`/event-quick-check?run=`, **`/projects/{platformProjectId}/…`**, `?platformProjectId=`).
4. Native `AssistantChat` receives `pageContext` and sends it on every complete/stream request.
5. When `platformProjectId` is set and the conversation has no project yet, seed the Collection picker.

## Embed / products

`assistant:context` MUST carry the same fields as `AssistantPageContext` (product required; Collection + entity when known). Embed page merges query bootstrap + live postMessage into `AssistantChat`.

See `specs/api/assistant-embed.md` for query keys and iframe stability.

## Server behaviour (Plexon orchestrator)

| Step | Behaviour |
|------|-----------|
| Parse | `parseAssistantPageContext(body.pageContext)` — ignore unknown fields |
| Collection | Prefer `pageContext.platformProjectId` when authorized (same rules as body/conversation); membership check |
| Bindings | Heal product mirrors (`audionProjectId`, `checkionProjectId`, …) from Collection when missing |
| Prompt | Append `## Aktueller Seitenkontext` with product, Collection, entity, deep-link hint + rule: **do not ask which Collection/project** when `platformProjectId` is set |
| Hydrate | Registry per `(capability \| entityType)` → optional compact block (EQC, CREATION editor, METRON entity hint today). Budget: `ASSISTANT_MAX_PAGE_CONTEXT_CHARS` |
| Tool inject | Family-specific: e.g. Audion `personas_list` → `project_id` = Collection’s Audion mirror; Checkion scan tools → `domain_scan_id` / entity id; Brandion → guideline/Collection; CREATION scene ops → scene id + lock |
| Planner / deixis | Phrases like “dieser/diese/hier” + present entity → prefer that entity’s tool family; keep sibling-product MCPs available for cross-ask within the same Collection. **Exception:** CREATION scene craft (`creation_scene_edit` / Slide\|Folie\|Landing create phrasing) MUST NOT be demoted to the host page entity (e.g. short “kannst du mir einen slide anlegen” on a persona detail). Keep `creation_scene_write`; optional AUDION read families may be merged for persona/journey page data. |
| Fail closed | Missing/forbidden hydrate → thin pathname + capability hint only |

### Example flows (acceptance scenarios)

**A — Checkion scan result.** User: “Insights zu diesem Scan?”  
→ `entityType=domain_scan`, `entityId=…`, `platformProjectId=…`  
→ Checkion MCP overview/detail for that id — no re-ask.

**B — Brandion guideline, ask personas.** User: “Welche Personas passen?”  
→ Collection from Brandion context → heal Audion binding → `personas_list` with that Collection’s Audion project — personas **of this Collection**.

**C — Audion persona detail.** User: “Fasse sie zusammen.”  
→ `entityType=persona` → `persona_get(entityId)` — no name search.

**C2 — Audion persona detail, create slide.** User: “kannst du mir einen slide anlegen”  
→ Stay on `creation_scene_edit` with `allowWriteTools` + `creation_scene_write` (do **not** demote to read-only `audion_persona` via short-prompt deixis). AUDION persona read tools may stay available for page-entity content.

**D — Plexon `/projects/{id}`.** Collection from path — persona lookup MUST NOT ask which project.

## Hydration budget

Compact block ≤ `ASSISTANT_MAX_PAGE_CONTEXT_CHARS` (default 6_000). Include ids, status, Collection ids, teasers — not full report JSON. `entityMeta` is never prompt-dumped.

### CREATION editor (P90)

| Constant | Value |
|----------|--------|
| `ASSISTANT_CAPABILITY_CREATION_EDITOR` | `creation_editor` |
| `ASSISTANT_ENTITY_COMPOSITION_SCENE` | `composition_scene` |

Host (creation-v3): `EditorWorkspace` publishes `entityId=sceneId`, `entityUpdatedAt=baseUpdatedAt`, optional `platformProjectId`. Embed posts `assistant:context` while flyout is open.

### METRON surfaces

| Constant | Value |
|----------|--------|
| `ASSISTANT_ENTITY_METRON_DASHBOARD` | `dashboard` |
| `ASSISTANT_ENTITY_METRON_KPI` | `kpi` |
| `ASSISTANT_ENTITY_METRON_DATASET` | `dataset` |

Host (metron-v3): pathname `/dashboards/:id` → `entityType=dashboard` + `entityId`. System prompt gets a compact METRON Seitenkontext block; tool-args inject `id` for get/evaluate/summarize. Full KPI hydrate via MCP evaluate remains SSOT (no second formula engine in Plexon). Live `assistant:context` + Collection pass-through shipped (Wave 1).

## Complete API

`AssistantCompleteBody.pageContext?: AssistantPageContext`

Server:

1. Validate shape (ignore unknown fields).
2. Prefer `pageContext.platformProjectId` for Collection binding when authorized.
3. If `capability === event_quick_check` and `entityType === event_quick_check_run` and `entityId` set → hydrate run (authz via `userCanAccessEventQuickCheckRun`).
4. Append compact block to system prompt: EQC / CREATION Editor / METRON / future registry entries.
5. On hydrate failure (missing/forbidden): keep a thin route hint only (pathname + capability).

## Rollout waves

| Wave | Scope | Deliverable |
|------|--------|-------------|
| **0** | Spec SSOT | This document + `knowledge/assistant-page-context-rollout.md` |
| **1** | Host plumbing | Checkion + Audion + Brandion + Metron (+ Videon): Provider, pass `platformProjectId`, live `assistant:context`; shell/contract tests |
| **2** | Entity publish | Checkion Scan/GEO; Audion Persona/TG/Journey; Brandion Guideline; Metron Dashboard/KPI; Videon Media/Cut |
| **3** | Hydrate + inject | Plexon: hydrate blocks + tool-inject map + `entityMeta` parse; planner deixis; contract tests “dieser Scan” / “Personas hier” |
| **4** | Echon + harden | Echon suite flyout; cross-app regression; capability-catalog traces |

Definition of Done per surface: (1) complete body has Collection + entity when on that surface, (2) no “Welches Projekt?”, (3) tool call hits the right entity/Collection, (4) unauthorized → no leak.

## Acceptance

1. On `/event-quick-check?run={id}` with open flyout, complete requests include `pageContext.entityId`.
2. Authorized users get EQC block in system prompt for free_chat turns.
3. Unauthorized / unknown run → no leak of run contents.
4. On `/projects/{platformProjectId}` (dashboard/flows/…) with open flyout, complete requests include `pageContext.platformProjectId` from the path — assistant MUST NOT ask which Collection/project to use for persona lookup.
5. Specs inventory + unit/contract tests green.
6. After Wave 1: every product host that mounts the FAB posts `assistant:context` with Collection when the page has one.
7. After Wave 2–3: deixis scenarios A–C above pass contract/smoke tests.
