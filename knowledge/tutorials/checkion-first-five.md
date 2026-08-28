# CHECKION — die ersten fünf Tutorials

## Serienziel

Die fünf Tutorials führen neue Nutzer:innen von einer leeren Collection zu den vier gängigsten CHECKION-Prüfungen. Jede Folge funktioniert einzeln, gemeinsam ergeben sie einen vollständigen Einstieg.

| Folge | ID | Titel | Zieldauer | Ergebnis |
|---:|---|---|---:|---|
| 1 | CHK-QS-01 | Neue Collection für CHECKION anlegen | 3 Min. | Workspace ist angelegt und synchronisiert |
| 2 | CHK-QS-02 | Erste Seite mit WCAG prüfen | 4–5 Min. | Einzelscan ist gestartet und Ergebnis geöffnet |
| 3 | CHK-CORE-02 | Komplette Domain untersuchen | 5–6 Min. | Corpus und systemische Probleme sind sichtbar |
| 4 | CHK-CORE-03 | SEO-Abdeckung einer Domain prüfen | 5–6 Min. | SEO-Coverage und Findability-Lücken sind eingeordnet |
| 5 | CHK-CORE-04 | GEO Model Memory messen | 6–8 Min. | Ungestützte Markenpräsenz in Modellantworten ist ausgewertet |

## Gemeinsame Demo-Grundlage

- Collection: **PLEXON Tutorial Demo**
- CHECKION project id: `proj-mt7mm5le`
- PLEXON Collection id: `f06a3c56-93d5-485e-85c4-61e2974d0cfe`
- Aktuelle Platzhalter-Domain: `example.com`

Für Folgen 2–5 sollte vor der Aufnahme eine kontrollierbare Demo-Domain verwendet werden. Sie sollte bewusst vorbereitete Accessibility-, SEO- und GEO-Testfälle enthalten. Produktive Kundendomains nur mit Freigabe crawlen.

## Redaktionsregeln

1. **Collection statt Produktprojekt:** „Project“ in CHECKION ist der lokale Capability-Datensatz derselben PLEXON Collection.
2. **Asynchrone Jobs:** Nach Launch bleibt die Oberfläche zunächst auf dem Startpunkt. Fortschritt und Ergebnis werden über **Jobs** verfolgt.
3. **Keine Erfolgsfiktion:** Queued, Running, Paused, Completed und Failed werden sichtbar und im Sprechertext korrekt benannt.
4. **Live/Demo/Fixture:** Vor jeder Aufnahme prüfen und im Begleittext angeben.
5. **GEO-Schichten trennen:** Model Memory und Live Search sind separate Jobs. Trefferquoten werden nie vermischt.
6. **Keine Kundendaten im Bild:** Projektauswahl und Listen vor der Aufnahme bereinigen oder gezielt kadrieren.

## Einheitlicher Aufbau pro Folge

1. Ergebnisversprechen in einem Satz
2. Ausgangspunkt und Voraussetzungen
3. Auswahl der Capability beziehungsweise Scan-Tiefe
4. Eingaben und bewusste Entscheidung erklären
5. Job starten und Status verfolgen
6. Ergebnisoberfläche orientieren
7. Wichtigste Interpretation
8. Übergang zur nächsten Folge

## Dateien

- `articles/checkion-fuenf-pruefungen.md` — zusammenhängender Einstieg als Artikel, inklusive annotierter Screenshots
- `checkion-01-project-create.md`
- `checkion-02-wcag-single-scan.md`
- `checkion-03-domain-deep-scan.md`
- `checkion-04-seo-crawl.md`
- `checkion-05-geo-model-memory.md`
