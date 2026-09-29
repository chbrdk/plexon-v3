# Assistant page context — suite rollout checklist

**Spec SSOT:** `specs/domain/assistant-page-context.md`  
**Protocol:** `specs/api/assistant-embed.md`  
**Flyout:** `specs/domain/central-assistant-flyout.md` · `knowledge/central-assistant-flyout.md`  
**Stand:** 2026-09-29 (Wave 0–4 landed: hosts + inject/deixis + regression matrix + Collection MCP cross-ask)

## Why

Users must talk to the same Assistant from any app with automatic Collection + entity context (“dieser Scan”, “Personas in diesem Projekt”). Today only CREATION (rich) and Plexon EQC / Collection hubs are close; most product FABs are theme-only.

## Current gap (audit)

| Host | FAB | Passes `platformProjectId` | Provider + page publish | Live `assistant:context` | Entity on detail |
|------|-----|----------------------------|-------------------------|--------------------------|------------------|
| plexon-v3 | yes (native) | yes (URL + publish) | yes | n/a (in-process) | EQC yes; hubs Collection |
| creation-v3 | yes | yes (merge + publish) | yes | yes | scene yes |
| metron-v3 | yes | **published** (dashboard) | **yes** | **yes** | URL + dashboard entity |
| checkion-v3 | yes | **published** (project / scan / domain / GEO) | **yes** | **yes** | page/domain/geo entity |
| audion-v3 | yes | **published** (project + detail) | **yes** | **yes** | persona / TG / journey |
| brandion-v3 | yes | **published** (project + guideline) | **yes** | **yes** | guideline entity |
| videon-v3 | yes | **active Collection + publish** | **yes** | **yes** | media / cut |
| msqdx-echon | **yes** (suite FAB) | optional | **yes** | **yes** | signal detail |

## Wave 0 — Spec (done in plexon-v3)

- [x] Extend `specs/domain/assistant-page-context.md` (principles, registry, host duties, waves, example flows)
- [x] This checklist
- [x] Cross-link from `knowledge/central-assistant-flyout.md` + `knowledge/paths.md` + `knowledge/specs-index.md`
- [x] `specs/api/assistant-embed.md`: hosts MUST re-post `assistant:context` on ready + Collection/entity change

## Wave 1 — Host plumbing (per product repo)

**Pattern to copy:** `creation-v3/apps/web/components/assistant-page-context.tsx` + `platform-assistant-host.tsx` (`postPlatformAssistantContext`, merge, ready handler).

### Shared checklist (every product below)

- [x] `AssistantPageContextProvider` wraps authenticated AppShell content
- [x] `PlatformAssistantHost` reads published context + props; merges pathname / Collection / capability / entity
- [x] AppShell / project layouts pass `platformProjectId={project.platformProjectId}` (or Active Collection) into the host — **never** product-local project path id as Collection
- [x] Embed bootstrap includes `project` + `pathname` (+ entity when known)
- [x] Live `postMessage` `assistant:context` on open/change **and** on `assistant:ready`
- [x] Iframe `src` frozen while open
- [x] Shell/contract test: host source contains `assistant:context` / `postPlatformAssistantContext`; layout passes Collection when fixture has `platformProjectId`

### checkion-v3 (priority 1)

- [x] Wave 1 plumbing (Provider, live `assistant:context`, Collection normalize)
- [x] Project workspace + scan/domain/GEO magazine shells publish Collection (+ soft entity ids)
- [x] Resolve Collection from loaded Checkion project / scan parent — not from `/projects/{localId}` segment alone

### audion-v3 (priority 1)

- [x] Wave 1 plumbing
- [x] On project detail, pass Collection from `project.platformProjectId` (real UUID only)
- [x] Wave 2: persona / TG / journey detail publish entity + Collection

### brandion-v3 (priority 2)

- [x] Wave 1 plumbing
- [x] Guideline / studio + project workspace publish Collection (+ guideline entity)

### metron-v3 (priority 2)

- [x] Keep URL entity resolve; add Provider + live `assistant:context`
- [x] Pass Collection into host from Collection-bound dashboards

### videon-v3 (priority 3)

- [x] Wave 1 plumbing aligned with Collection workspace layouts
- [x] Media / Cut editors publish Collection + entity

### plexon-v3 (Wave 1–3 touch)

- [x] Entity constants for Checkion / Audion / Brandion in `lib/assistant/page-context/`
- [x] Tool-arg inject: scan / persona / guideline / videon media+cut ids from `pageContext`
- [x] Route-hint hydrate covers Collection + entity (never ask Collection when set)
- [x] `entityMeta` parse (inject-only; never prompt dump)
- [x] Planner deixis: `preferPageEntityPlan` for scan / persona / guideline / videon
- [x] Contract tests for entity inject + deixis

## Wave 4 — Echon + harden

- [x] msqdx-echon: mount suite FAB → plexon embed (same host contract; product ChatOverlay stays)
- [x] Cross-app regression matrix (open flyout on each surface → assert complete `pageContext`) — `__tests__/assistant-page-context-regression.test.ts`
- [x] Capability-catalog / MCP gate: Collection context keeps sibling products available for cross-ask — `mcp-flags-for-plan` brandion↔audion↔checkion
- [x] Update product `knowledge/paths.md` / specs where hosts document assistant paths
- [x] Echon suite FAB deployed on `chbrdk/echon-v3` (`1a1ec30`; Coolify env `VITE_PLEXON_*`; Postgres volume preserved)
## Acceptance scenarios (manual / contract)

1. **Checkion scan:** “Insights zu diesem Scan?” → tools use that `domain_scan` id; no project question.
2. **Brandion → personas:** “Welche Personas?” → Audion list for **this** Collection.
3. **Audion persona detail:** “Fasse sie zusammen.” → `persona_get(entityId)`.
4. **Plexon Collection hub:** persona lookup without “Welches Projekt?”.
5. **Unauthorized entity:** thin hint only; no leak.

## Implementation order (recommended)

1. Wave 1 Checkion + Audion (highest user pain).  
2. Wave 1 Brandion + Metron live context.  
3. Wave 2 Checkion scan + Audion persona in parallel.  
4. Wave 3 inject/hydrate in plexon.  
5. Videon + Echon + harden.
