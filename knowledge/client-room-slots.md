# ClientRoom Slot Publish — Produkt-Contract (E2)

**Spec:** `specs/domain/suite-enterprise-program.md` § E2  
**Code:** `lib/collection-client-room.ts` · `…/client-room/slots/[slotId]/route.ts`  
**Constants:** `apiPlatformProvisioningCollectionClientRoomSlot`

## Zweck

Produkte schreiben freigegebene Artefakte in den Collection-Kundenraum. Plexon speichert nur Slot-Destillate (Titel, Subject-Ref, optionaler Deep-Link). Rohdaten bleiben im Produkt.

## Endpoint

```
PUT /api/platform/provisioning/collections/{platformProjectId}/client-room/slots/{slotId}
```

### Auth

| Pfad | Regel |
|---|---|
| Session | Cookie; Actor muss Collection **manage** (oder Admin) |
| Service | `Authorization: Bearer {PLEXON_SERVICE_SECRET}` + Federation-Contract-Header (`getPlexonContractHeaders`) + `actorUserId` (Body oder `X-Plexon-User-Id`); Actor muss Collection **view**; `serviceTrusted` überspringt Manage |

Ohne `actorUserId` → `400 actor_required`.  
Kein aktiver Raum → `404 room_missing` (Produkt: skip, nicht crashen).

### Body

Setzen:

```json
{
  "productId": "checkion",
  "subjectRef": "<produkt-objekt-id>",
  "title": "Kurzlabel für den Kunden",
  "href": "https://…/optional-deep-link",
  "actorUserId": "<plexon-user-id>"
}
```

Leeren:

```json
{ "clear": true, "actorUserId": "<plexon-user-id>" }
```

### Geschlossene Slot-IDs

| slotId | productId | Freigabe-Trigger (Produkt) |
|---|---|---|
| `quick_check` | `plexon` | Event Quick Check Share anlegen (`POST …/event-quick-check/runs/:runId/share`) |
| `checkion_overview` | `checkion` | Explizite Overview-Freigabe / Launch-Gate `quality_ok` |
| `brand_findings` | `brandion` | Explizite Findings-Freigabe (nicht jeder Measure-Lauf) |
| `creation_pages` | `creation` | Client Page Share **approved** |
| `metron_dashboard` | `metron` | Explizite Dashboard-Freigabe |
| `videon_cut` | `videon` | Export-Freigabe / Cut approve |

## Produkt-Client-Muster

Jedes Produkt hält `apps/web/lib/plexon-client-room.ts` analog zum Audit-Client:

- Skip wenn Federation nicht `live` / kein Secret / kein `platformProjectId` / kein Actor
- `404 room_missing` → `false` (Raum optional)
- Nie throwen; `schedulePutClientRoomSlot` für fire-and-forget nach Approve

## Audit

Jeder erfolgreiche Slot-Put schreibt `suite_audit_events` mit `action: approved` (Set) bzw. `revoked` (Clear).

## Panel

Collection-Home `CollectionClientRoomPanel` zeigt aktive Slots read-only. Create/Rotate liefert den öffentlichen Token-URL einmalig; Produkte füllen die Slots.
