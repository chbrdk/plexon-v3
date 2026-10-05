# WCAG-Domain-Deep-Scan starten

Ein **Deep Scan** startet an einer URL und folgt erreichbaren Seiten unter dem Host. Nutze ihn, wenn ein Quick Scan Issues gefunden hat und du wissen willst, ob sie sich über Templates wiederholen.

## Schritte

1. CHECKION aus deiner Collection öffnen → **New scan** / Scan.
2. **WCAG** → **Deep scan** wählen.
3. Freigegebene Einstiegs-URL eintragen (Host-Wurzel liefert meist einen breiteren Corpus als ein tiefer Pfad).
4. Collection-Zuordnung prüfen.
5. **Launch deep scan** — der Job ist asynchron und kann deutlich länger laufen als ein Einzelscan.
6. Fortschritt unter **Jobs** verfolgen (Seiten, aktuelle URL). Pause / Resume / Cancel können verfügbar sein; Abbruch erzeugt **kein** vollständiges Domain-Ergebnis.
7. Bei **Completed** das Domain-Magazin öffnen: zuerst Overview, dann systemische Issues und betroffene Seiten.

## Ergebnis lesen

- **Systemische** Issue-Gruppen (viele Seiten) vor Einzelfällen priorisieren.
- Scoreline ist **weakest first** — mit der schwächsten Dimension starten.
- Fehlende Kapitel oder leere Daten sind **kein** Bestanden.
- Ein unvollständiger Crawl ist keine vollständige Domainbewertung.

## Regeln

- Nur Domains crawlen, die du testen darfst.
- Collection-Kontext mit späteren SEO- und GEO-Läufen teilen.

## Weiter

- [Einstieg](checkion.getting-started)
- [WCAG-Quick-Scan](checkion.scan.wcag-quick)
- [SEO-Crawl](checkion.scan.seo-crawl)
