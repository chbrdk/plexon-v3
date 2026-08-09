# AUDION Persona-Generierung aus PLEXON

## Symptom

`Persona-Generierung: AUDION API: … HTML (404)` — Zielgruppe wird angelegt, Persona schlägt fehl.

## Ursache (audion-v3)

PLEXON ruft `POST {AUDION_API_URL}/target-groups/{id}/personas/generate` auf.

| Route | Status |
|-------|--------|
| `POST /api/target-groups` | ja (CRUD) |
| `POST /api/ai/target-groups/{id}/personas/generate` | ja (UI / AI workflows) |
| `POST /api/target-groups/{id}/personas/generate` | PLEXON-Kompatibilität — muss in audion-v3 deployed sein |
| `POST /api/personas/generate` | **nein** → 404 HTML |

Fehlt die Kompatibilitätsroute, liefert Next.js 404-HTML (Login-Redirect) — die Fehlermeldung klingt fälschlich nach „Web statt FastAPI“.

## Fix

- **audion-v3:** `apps/web/app/api/target-groups/[targetGroupId]/personas/generate/route.ts` (Alias auf native AI generate)
- **plexon-v3:** `audionApiTargetGroupPersonasGenerate` + unwrap `{ personas: [...] }` Response

## Coolify (PLEXON)

```
AUDION_API_URL=https://audion-v3.projects-a.plygrnd.tech/api
AUDION_API_TOKEN=audion_…   # identisch auf audion-v3 Web
```

Nach Route-Fix: **audion-v3** redeployen (nicht nur PLEXON).
