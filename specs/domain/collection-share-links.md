# Collection Share Links

**Status:** Accepted — 2026-09-26  
**Owner:** PLEXON  
**Federation:** `2026-05-plexon-federation-v3`  
**Related:** `creation-client-share.md` (Creation policy + legacy projection) · `suite-enterprise-program.md` § E2 (ClientRoom deferred in UX)

## Zweck

Eine Collection zeigt **alle kundennahe Share-Links** an einer Stelle. Plexon speichert nur Destillate (Titel, Produkt, optionaler öffentlicher `href`). Token und Snapshots bleiben im Produkt bzw. in der bestehenden Share-Tabelle.

Dies ist **kein** Kundenraum: kein gemeinsames Token, keine Slots. Invite-Links (`collection-invite-links.md`) bleiben getrennt.

## Geschlossene productId

| productId | kind (geschlossen, v1) | Quelle |
|---|---|---|
| `creation` | `client_page` | Creation Client Page Share Projection |
| `plexon` | `quick_check` | Event Quick Check share |
| `metron` | `dashboard` | METRON App `/api/share` und/oder Assistant dashboard share |
| `videon` | `cut` | Follow-up (Spec only) |
| `checkion` | — | Follow-up |

## Projection `collection_share_links`

| Feld | Regel |
|---|---|
| `productId` + `shareId` | Composite PK |
| `platformProjectId` | Pflicht |
| `kind` | Produktspezifisches Verb aus der Tabelle oben |
| `title` | Kurzlabel für die Liste |
| `href` | Öffentliche Viewer-URL ohne Secret; darf fehlen wenn Token nur im Produkt liegt |
| `expiresAt` | optional |
| `revokedAt` | gesetzt bei Widerruf |
| `meta` | JSON ohne Token/Password/Secret-Keys |
| `createdAt` / `updatedAt` | |

## API

| Route | Auth | Rolle |
|---|---|---|
| `GET …/share-links` | Session oder Service + actor | Collection **view** |
| `POST …/share-links` | Service secret + contract + `actorUserId` | Collection **view** (`serviceTrusted`) |
| `DELETE …/share-links/:shareId?productId=` | Session | Collection **manage**; markiert revoked + best-effort Fan-out |

POST Body:

```json
{
  "productId": "metron",
  "shareId": "…",
  "kind": "dashboard",
  "title": "Q3 Dashboard",
  "href": "https://…/share/…",
  "expiresAt": null,
  "actorUserId": "…",
  "meta": {}
}
```

Clear/revoke via DELETE oder POST mit `"revoked": true`.

## Writers (v1)

- Creation: dual-write aus `upsertClientShareProjection` / revoke.
- EQC: beim Share-Create.
- Metron Assistant Share: beim Create wenn `platformProjectId` gesetzt.
- Metron App: Client `plexon-share-links.ts` bei Share create/revoke.

## UI

Collection-Home Band **Freigaben / Share-Links**: flache Liste + Creation-Policy-Subsection (bestehende Policy-API).  
Kundenraum-Panel ist in der UX **ausgeblendet** (API bleibt).

## Acceptance

- Manager sehen aktive Links aller v1-Quellen in einer Liste.
- Revoke eines Creation-Links cleart Projection und fan-out wie bisher.
- Leere Liste zeigt keinen Fixture-Eintrag.
- Kein Token im Registry-Payload.
