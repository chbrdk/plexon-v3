# AUDION Persona-Generierung aus PLEXON

## Symptom

`Persona-Generierung: AUDION API: Login-Redirect/HTML (404)` — Zielgruppe wird angelegt, Persona schlägt fehl.

## Ursache

PLEXON rief `POST {base}/personas/generate` auf. Die AUDION-Web-App proxyt unter `/api` nur explizite Next-Routen:

| Route | Next.js `/api`-Proxy |
|-------|----------------------|
| `POST /api/target-groups` | ja |
| `POST /api/target-groups/{id}/personas/generate` | ja |
| `POST /api/personas/generate` | **nein** → 404 HTML |

Bei Fallback `{NEXT_PUBLIC_AUDION_ADMIN_URL}/api` (wenn `AUDION_API_URL` fehlt) scheitert nur der Persona-Schritt — daher wirkt die Konfiguration „fast richtig“.

## Fix (PLEXON)

`lib/paths/audion-api.ts` → `audionApiTargetGroupPersonasGenerate(targetGroupId)`  
`lib/integrations/audion-persona-bootstrap-client.ts` → Body: `{ segment, description, filter_mode: 'auto' }`

## Coolify (PLEXON)

Empfohlen weiterhin:

```
AUDION_API_URL=http://audion-api:8000
AUDION_API_TOKEN=audion_…
```

Alternativ öffentlich: `https://audion.<domain>/api` (mit `/api`-Suffix).

Nach Env-Änderung PLEXON-Container neu deployen.
