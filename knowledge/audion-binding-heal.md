# Audion binding heal — Resolve statt Create

**Status:** 2026-09-23  
**Specs:** `specs/domain/collection-projects.md` · Access Model B  
**Code:** `lib/assistant/workflows/heal-audion-binding.ts` · `ensure-platform-product-bindings.ts` · Audion `lib/sync-project-plexon.ts`

## Problem

Plexon Chat/API „sieht“ Audion nur über `platform_project_product_bindings.external_project_id`.  
Audion UI kann bereits `projects.platform_project_id` gesetzt haben, während die Plexon-Binding-Zeile `null` bleibt → Assistant will ein **neues** Audion-Projekt anlegen.

## Diagnose (Staging)

Für Collection `{pp}`:

1. Plexon Binding: `SELECT product_id, external_project_id, sync_status FROM platform_project_product_bindings WHERE platform_project_id = '{pp}' AND product_id = 'audion';`
2. Audion: Projekt mit `platform_project_id = '{pp}'` → lokale `id`
3. Stimmt (1).external mit (2).id? Wenn Audion-ID gesetzt und Binding null → Heal nötig.

API-Probe (Service-Secret + Actor):

`GET {AUDION_PLATFORM_API}/platform/provisioning/projects/{pp}` → `externalProjectId`

## Heal-Pfade

| Trigger | Verhalten |
|---------|-----------|
| `ensurePlatformProductBindings` nach Sync | GET Audion mirror → `upsertPlatformProjectBinding` |
| Assistant `complete` mit Collection-Kontext | gleiche Ensure inkl. Heal bevor Tools/Intents |
| `create_project` Intent mit `platformProjectId` | Resolve/Heal, **kein** zweites Collection |
| Audion `syncProjectToPlexon` `alreadyBound` | Origin mit `platformProjectId` → Rebind |

## Ops

- Sample-Rebind: Audion Project Sync/„Register on Plexon“ erneut auslösen, oder Collection im Chat öffnen (complete heilt).
- Nie Direct-Create, solange Audion GET die Collection kennt.
