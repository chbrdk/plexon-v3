# Collection Knowledge Sync — Audion ↔ Checkion ↔ Plexon

Stand: 2026-08-03

## Ziel

Plexon Collection Knowledge Pack ist die **gemeinsame SoT** für geteiltes Wissen. Audion und Checkion ziehen bei Bedarf Facetten und **autosyncen Distillate** zurück — gleicher Wissensstand für GEO, Research und Personas.

## Pull-on-use (lesen)

| Produkt | Wann | Facetten |
|---------|------|----------|
| **Audion** | Research start; Persona generate/suggest; Target-group suggest | `profile`, `competitive`, `geo_context`, `research_brief` |
| **Checkion** | GEO suggest/create (`CHECKION_FEDERATION_MODE=live`) | `profile`, `competitive`, `geo_context`, `research_brief` |
| **Plexon** | Collection Knowledge Band (CRUD + AI suggest) | alle Facetten |

Ohne Collection-Binding oder bei fehlender Auth → Produkt arbeitet lokal weiter (kein Hard-Fail).

## Autosync (schreiben)

| Produkt | Trigger | Facetten |
|---------|---------|----------|
| **Audion** | Nach erfolgreichem Research-Job | `research_brief` (replace; inkl. Knowledge-Chapters) |
| **Checkion** | Nach completed GEO-Job (`federation=live`) | `geo_context` (replace) + `competitive` (merge) |

Manuelle **Re-sync**-CTAs bleiben für Dossier-Edits / Retry. Soft-skip wenn unbound, dummy mode, oder Pack unreachable (Job bleibt lokal erfolgreich).

Kill-switch: `KNOWLEDGE_PACK_AUTOSYNC=0` (beide Apps).

Publish nutzt optimistic concurrency (`expectedRevision`); Clients retry einmal nach `409` mit frischer Revision.

## Staging-Env (Coolify)

Beide Produkte müssen denselben Plexon-Host und denselben Service-Secret sehen:

```
# plexon-v3
PLEXON_SERVICE_SECRET=<shared>

# audion-v3
PLEXON_AUTH_URL=https://plexon-v3.projects-a.plygrnd.tech
PLEXON_SERVICE_SECRET=<shared>

# checkion-v3
CHECKION_FEDERATION_MODE=live
NEXT_PLEXON_BASE_URL=https://plexon-v3.projects-a.plygrnd.tech   # optional wenn Auth-URL gesetzt
PLEXON_AUTH_URL=https://plexon-v3.projects-a.plygrnd.tech
PLEXON_SERVICE_SECRET=<shared>
```

Checkion: wenn `NEXT_PLEXON_BASE_URL` fehlt, fällt `plexonBaseUrl()` auf `PLEXON_AUTH_URL` zurück.

## Smoke (manuell)

1. Collection in plexon-v3 anlegen / öffnen → Knowledge Band sichtbar.
2. Audion-Projekt an Collection binden → Research starten → `research_brief` erscheint ohne CTA in Plexon.
3. Checkion GEO (live) mit Collection → nach Job-Complete erscheinen `geo_context` / `competitive` in Plexon.
4. Audion Personas generate auf gebundenem Projekt → Kontext enthält Brief/GEO-Themes.
5. Optional: Re-sync-CTA nach Dossier-Edit → Revision steigt.

## Specs

- `specs/domain/collection-knowledge-pack.md`
- `audion-v3/specs/domain/knowledge-pack-publish.md`
- `checkion-v3/specs/domain/geo-knowledge-consume.md`
- `knowledge/platform-federation-contract.md`
