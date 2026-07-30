# Dashboard – Produkt-Registry und Einstiegs-URLs

## Wo im Code

- **UI:** `app/page.tsx` – Abschnitt `data-section="product-teasers"` (nur bei eingeloggten Nutzern).
- **Produktkatalog:** `app/products/page.tsx`
- **Registry:** `lib/platform-products.ts`
- **Runtime-Status API:** `app/api/platform/products/route.ts`
- **Zentrale URLs:** `lib/constants.ts` – `getAudionAdminUrl()`, `getCheckionUrl()`, optionale URLs fuer spaetere Produkte.

## Umgebungsvariablen (optional)

| Variable | Standard (wenn leer) |
|----------|----------------------|
| `NEXT_PUBLIC_AUDION_ADMIN_URL` | `https://audion.projects-a.plygrnd.tech/admin/` |
| `NEXT_PUBLIC_CHECKION_URL` | `https://checkion.projects-a.plygrnd.tech/` |
| `NEXT_PUBLIC_VIDEON_URL` | leer (Produkt bleibt `planned`) |
| `NEXT_PUBLIC_BRANDION_URL` | leer (Produkt bleibt `planned`) |

Siehe auch `.env.example`.

## Öffnen der Links

Die Registry liefert Einstiegspunkte und Runtime-Status. Foederierte Produkt-Links werden weiter in neuen Tabs geoeffnet, damit Session- und Cookie-Grenzen zwischen den Produkten sauber getrennt bleiben.

## Anmeldung „direkt angemeldet“

Die Teaser und der Produktkatalog oeffnen die Ziel-App in einem **neuen Tab**. Eine automatische Session-Uebernahme von PLEXON (NextAuth-Cookie) ist **browseruebergreifend nicht moeglich**, solange CHECKION/AUDION eigene Cookies setzen.

Mit der zentralen Auth (`POST /api/auth/validate-credentials` in PLEXON) reicht **dieselbe E-Mail und dasselbe Passwort** wie in PLEXON; Nutzer melden sich beim ersten Besuch der Ziel-App einmalig an.
