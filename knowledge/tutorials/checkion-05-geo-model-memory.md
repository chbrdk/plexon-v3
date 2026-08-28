# CHK-CORE-04 — GEO Model Memory messen

## Tutorial-Steckbrief

| Feld | Inhalt |
|---|---|
| Format | Kernworkflow |
| Zieldauer | 6–8 Minuten |
| Oberfläche | CHECKION `/scan` → GEO → Model memory |
| Lernziel | Ungestützte Markenpräsenz über Fragen und Modelle messen |
| Erfolg | Recall, Platzierung, Share of Voice und Wettbewerber werden korrekt interpretiert |

## Messprinzip

**Model memory** ist Layer 1: Modelle antworten ohne Live-Websuche aus ihrem vorhandenen Wissen. Das Ergebnis zeigt Recall und Markenpräsenz im Modellgedächtnis, nicht die aktuelle Sichtbarkeit im Web.

**Live search** ist Layer 2 und ein eigener Job. Beide Layer dürfen gleichzeitig ausgewählt werden, erzeugen aber getrennte Messungen. Trefferquoten werden nie gemischt. Dieses Tutorial verwendet ausschließlich **Model memory**.

## Voraussetzungen

- Markenname und Domain sind eindeutig.
- Drei bis fünf realistische Nutzerfragen sind vorbereitet.
- Die Collection ist verfügbar.
- Die in der Zielumgebung tatsächlich unterstützten Modelle sind geprüft.
- Live-, Demo- oder Fixture-Betrieb ist dokumentiert.

## Klickpfad

1. **Scan** öffnen.
2. **GEO** wählen.
3. Nur **Model memory** aktivieren.
4. **URL** und/oder **Company name** eintragen.
5. Unter **Project** die bestehende Collection auswählen.
6. Die vorgeschlagenen **Queries** prüfen, bearbeiten, entfernen oder ergänzen.
7. Optional **Suggest** verwenden und Vorschläge bewusst übernehmen.
8. Unter **Models** nur die in der Umgebung verfügbaren Modelle belassen.
9. **Start GEO job** wählen.
10. Job unter **Jobs** bis **Completed** verfolgen.
11. Overview sowie Query-/Modelldetails öffnen.

## Sprechertext und Bildschirmregie

| Zeit | Bildschirmregie | Sprechertext | Einblendung |
|---:|---|---|---|
| 00:00 | Capability-Auswahl | „Nach Accessibility und SEO messen wir jetzt, ob eine Marke in Antworten von KI-Modellen überhaupt präsent ist.“ | GEO Model Memory |
| 00:20 | **GEO** wählen | „GEO untersucht Zitate, Platzierungen und Share of Voice in generativen Antworten.“ | Answer Engines · GEO |
| 00:38 | Measurement Tiles | „CHECKION trennt zwei Messschichten. Model memory fragt ungestützt aus dem Modellwissen. Live search verwendet aktuelle Webquellen. Dieses Tutorial bleibt bewusst bei Model memory.“ | Layer 1 · Model memory |
| 01:06 | Nur Model memory aktivieren | „Wir aktivieren nur Model memory. Dadurch bleibt später eindeutig, was das Modell bereits kennt – ohne Einfluss einer Websuche.“ | Keine Live-Suche |
| 01:28 | URL und Company name | „Wir geben die Domain, den Markennamen oder beides an. Mindestens eines der beiden Felder ist erforderlich.“ | URL oder Company erforderlich |
| 01:54 | Project-Auswahl | „Wir wählen unsere bestehende Collection. Ohne Auswahl kann CHECKION beim Start automatisch einen neuen Datensatz erzeugen; für ein sauberes Tutorial vermeiden wir das.“ | Bestehende Collection wählen |
| 02:20 | Query-Liste | „Die Queries sind der eigentliche Messplan. Sie sollten reale Fragen abbilden – etwa nach Alternativen, Marktführern oder einem Vergleich mit Wettbewerbern.“ | Reale Nutzerfragen |
| 02:50 | Query bearbeiten | „Jede Frage lässt sich direkt bearbeiten, entfernen oder ergänzen. Generische Fragen liefern meist weniger verwertbare Ergebnisse als konkrete Entscheidungssituationen.“ | Spezifisch statt generisch |
| 03:20 | **Suggest** kurz zeigen | „Suggest kann weitere Fragen vorschlagen. Wir übernehmen sie nicht blind, sondern prüfen Zielgruppe, Intent und Marktrelevanz.“ | Vorschläge kuratieren |
| 03:48 | Models | „Unter Models kontrollieren wir den Messumfang. Wir belassen nur Modelle, die in dieser Umgebung tatsächlich unterstützt werden.“ | Verfügbarkeit prüfen |
| 04:12 | **Start GEO job** | „Start GEO job erzeugt die Messung. Auch hier verfolgen wir den Status über Jobs und öffnen erst ein abgeschlossenes Ergebnis.“ | Separater GEO Job |
| 04:40 | Jobs | „Je mehr Fragen und Modelle wir kombinieren, desto mehr Einzelantworten müssen erzeugt und ausgewertet werden.“ | Queries × Models |
| 05:06 | GEO Overview | „Im Overview betrachten wir zunächst, wie oft die Marke vorkommt, wie häufig sie zitiert oder platziert wird und welchen Anteil sie gegenüber Wettbewerbern erreicht.“ | Präsenz · Platzierung · SoV |
| 05:34 | Wettbewerber/Share of Voice | „Share of Voice ist relativ zum gemessenen Fragenset. Er beschreibt nicht den gesamten Markt und sollte nur zwischen vergleichbaren Runs gegenübergestellt werden.“ | Nur vergleichbare Runs |
| 06:02 | Query-/Modelldetail | „In den Details sehen wir, welche Frage und welches Modell das Ergebnis verursacht haben. So unterscheiden wir ein generelles Muster von einem einzelnen Ausreißer.“ | Frage × Modell prüfen |
| 06:32 | Abschluss | „Model memory beantwortet: Was kennt das Modell bereits? Für aktuelle, webgestützte Sichtbarkeit würden wir anschließend einen separaten Live-search-Job starten.“ | Model Memory ≠ Live Search |

## Interpretationsregeln

- Recall ist kein Live-Webranking.
- Share of Voice gilt nur für die gewählten Queries, Modelle und Wettbewerber.
- Queries und Modellset müssen für Zeitvergleiche möglichst stabil bleiben.
- Einzelantworten immer im Query-/Modelldetail prüfen.
- Model Memory und Live Search nie in einer gemeinsamen Trefferquote zusammenfassen.
- Fixture-Ergebnisse nicht als reale Modellmessung präsentieren.

## Fehlerpfade

| Situation | Reaktion |
|---|---|
| Start ist deaktiviert | URL oder Company name sowie mindestens eine gültige Query prüfen. |
| Kein Project gewählt | Für dieses Tutorial bestehende Collection auswählen; Auto-Create vermeiden. |
| Modell nicht verfügbar | Nicht unterstütztes Modell entfernen und Messumfang dokumentieren. |
| Suggest liefert Fixture-Vorschläge | Als Vorschlagshilfe kennzeichnen, nicht als Research-Ergebnis. |
| Job schlägt fehl | Provider-/Konfigurationsstatus prüfen und neuen Job starten. |
| Keine Markennennung | Als echten Nullbefund behandeln, sofern der Run live und vollständig ist. |

## QA vor Veröffentlichung

- [ ] Nur Model memory ist ausgewählt.
- [ ] URL oder Company name ist korrekt.
- [ ] Bestehende Collection wurde gewählt.
- [ ] Queries sind redaktionell geprüft.
- [ ] Modelle sind in der Aufnahmeumgebung verfügbar.
- [ ] Ergebnisstatus ist Completed.
- [ ] Model Memory und Live Search werden sprachlich strikt getrennt.
- [ ] Live-, Demo- oder Fixture-Status ist angegeben.

