# CHECKION service auth + actor (401 on domain-scans)

Stand: **2026-09-21**

## Symptom

```
CHECKION domain-scans start: HTTP 401 – {"error":"unauthorized"}
```

Also: Vaillant corpus bootstrap `domain-scans list: HTTP 401`.

## Cause

Plexon `resolveCheckionServiceAuth()` always attached `X-Service-Secret` when `PLEXON_SERVICE_SECRET` was set, even **without** `X-Plexon-User-Id`.

On checkion-v3 (`getRequestUser`): service-secret path is **fail closed** without actor — it returns `null` and never falls through to a personal Settings Bearer (`checkion_…`). Spec: `specs/domain/assistant-actor-identity.md`.

## Fix

`lib/integrations/checkion-connectivity.ts`: attach `X-Service-Secret` + contract header **only when an actor is present**.

Domain-scan client (`checkion-domain-scans-v3-client.ts`) threads `actorUserId` through start / poll / detail / preview / list so Access Model B stays consistent for the whole crawl.

| Call | Headers | Checkion viewer |
|------|---------|-----------------|
| No actor | Bearer only | Token owner (personal Settings token) |
| With actor | Bearer + secret + `X-Plexon-User-Id` | Actor (Access Model B) |

Tests: `__tests__/checkion-service-auth-actor.test.ts`, `__tests__/domain-scan-workflow.test.ts`

## Ops note

`CHECKION_API_TOKEN` on Plexon must be a **valid Settings → API-Zugang** token that exists in checkion-v3’s DB (format `checkion_` + 64 hex). Machine-only env equality needs `CHECKION_API_TOKEN` set on **both** apps **and** an actor header.
