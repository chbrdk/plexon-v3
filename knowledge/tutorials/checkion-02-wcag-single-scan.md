# CHK-QS-02 — Erste Seite mit WCAG prüfen

## Tutorial-Steckbrief

| Feld | Inhalt |
|---|---|
| Format | Quick Start |
| Zieldauer | 4–5 Minuten |
| Ausgangspunkt | CHECKION Workspace der Collection |
| Lernziel | Eine einzelne URL als WCAG Quick Single prüfen und das Ergebnis finden |
| Erfolg | Job ist abgeschlossen; Overview, Issues und Detail sind auffindbar |

## Voraussetzungen

- Die Collection **PLEXON Tutorial Demo** ist angelegt.
- Eine freigegebene Test-URL ist erreichbar.
- Der Aufnahmebetrieb ist als Live, Demo oder Fixture identifiziert.
- Für ein aussagekräftiges Ergebnis sollte die Demo-Seite mindestens einige bekannte Accessibility-Testfälle enthalten.

## Klickpfad

1. Unter **Projects** die Collection öffnen.
2. **New scan** wählen.
3. Prüfen, dass **WCAG** und **Quick single scan** ausgewählt sind.
4. Unter **URL** die exakte Seite eintragen.
5. Unter **Project** die richtige Collection prüfen.
6. **Launch single scan** wählen.
7. Den Hinweis zum gestarteten Job bestätigen und **Jobs** öffnen.
8. Bei **Completed** das Ergebnis öffnen.
9. Kurz zwischen **Overview**, **Issues** und **Detail** orientieren.

## Sprechertext und Bildschirmregie

| Zeit | Bildschirmregie | Sprechertext | Einblendung |
|---:|---|---|---|
| 00:00 | Collection Workspace, CTA New scan | „In diesem Quick Start prüfen wir genau eine Seite auf Barrierefreiheit. Das ist der schnellste Einstieg in CHECKION.“ | WCAG Quick Single |
| 00:15 | **New scan** wählen | „Wir starten direkt aus unserer Collection. Dadurch bleibt das Ergebnis dem richtigen Arbeitskontext zugeordnet.“ | Collection-Kontext bleibt erhalten |
| 00:30 | WCAG und Quick single zeigen | „WCAG ist die Accessibility-Capability. Quick single untersucht eine konkrete URL. Für eine komplette Domain verwenden wir später Deep scan.“ | Eine URL · ein Ergebnis |
| 00:52 | URL-Feld aktivieren | „Hier tragen wir die exakte Seite ein, die wir bewerten möchten – einschließlich des vollständigen HTTPS-Pfads.“ | URL prüfen |
| 01:12 | Project-Auswahl zeigen | „Unter Project kontrollieren wir, dass die richtige PLEXON Collection ausgewählt ist. CHECKION speichert den Scan in ihrem lokalen Capability-Datensatz.“ | Richtige Collection |
| 01:32 | **Launch single scan** | „Mit Launch single scan wird der Job in die Warteschlange gestellt. Ein angelegter Job ist noch kein fertiges Ergebnis.“ | Job gestartet |
| 01:50 | **Jobs** öffnen | „Über Jobs sehen wir, ob die Prüfung wartet, läuft, abgeschlossen ist oder fehlgeschlagen ist. Wir öffnen das Ergebnis erst bei Completed.“ | Queued → Running → Completed |
| 02:22 | Ergebnis Overview | „Das Overview beantwortet zuerst: Wie steht die Seite insgesamt da, und welches Signal ist am schwächsten?“ | Overview · Was zählt? |
| 02:48 | Scoreline und Top Issues | „Die Kategorien sind weakest first sortiert. Wir beginnen also nicht mit dem besten Wert, sondern mit dem größten Handlungsbedarf.“ | Schwächstes Signal zuerst |
| 03:12 | **Issues** öffnen | „Issues zeigt die konkreten Findings. Marker und Einträge verknüpfen das Problem mit der betroffenen Stelle und der empfohlenen Korrektur.“ | Issues · Was, wo, was tun? |
| 03:40 | **Detail** zeigen | „Detail enthält die technischen Messwerte und ergänzende Befunde – etwa zu Performance, SEO, UX oder Seitentechnik.“ | Detail · Messwerte |
| 04:02 | Zur Collection oder Overview zurück | „Damit ist der erste Einzelscan abgeschlossen. Als Nächstes untersuchen wir, ob sich Probleme über eine ganze Domain wiederholen.“ | Nächste Folge: Deep scan |

## Was im Ergebnis erklärt werden muss

- Overall Score ist eine Orientierung, kein Ersatz für einzelne Findings.
- Scoreline wird **weakest first** gelesen.
- **Overview** erklärt Relevanz und Priorität.
- **Issues** zeigt konkrete Regelgruppen, betroffene Stellen und Maßnahmen.
- **Detail** enthält das kompakte technische Inventar.
- Mehrere Vorkommen derselben Regel können zu einer Finding-Gruppe zusammengefasst sein.

## Fehlerpfade

| Situation | Reaktion |
|---|---|
| Launch ist nicht möglich | URL und Project prüfen; vollständiges `https://` verwenden. |
| Job bleibt Queued | Über Jobs beobachten; nicht als Ergebnisfehler interpretieren. |
| Job schlägt fehl | Fehlermeldung lesen, URL-Erreichbarkeit prüfen und neuen Job starten. |
| Ergebnis enthält kaum Issues | Nicht künstlich dramatisieren; für die Aufnahme eine vorbereitete Demo-Seite verwenden. |
| Screenshot fehlt | Findings können weiter gelesen werden; Aufnahme nicht als visuellen Overlay-Workflow verkaufen. |

## QA vor Veröffentlichung

- [ ] Die Aufnahme startet aus der richtigen Collection.
- [ ] WCAG und Quick single scan sind sichtbar.
- [ ] Die URL ist freigegeben und exakt.
- [ ] Jobstatus wird ehrlich gezeigt.
- [ ] Overview, Issues und Detail stimmen mit der aktuellen Oberfläche überein.
- [ ] Live-, Demo- oder Fixture-Status ist dokumentiert.

