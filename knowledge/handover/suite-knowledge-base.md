# PLEXON Suite — Wissensdatenbank für Marketing und Tutorials

**Zweck:** belastbarer Ausgangspunkt für Erklärformate, Artikel, Tutorials, Screenplays und weitere Produktkommunikation.

## 1. Produktkern

PLEXON ist der gemeinsame Arbeitsraum der Suite. Nutzer:innen arbeiten in einer **Collection**: einem projektbezogenen Kontext für Wissen, Ergebnisse, Zugänge und Capability-Arbeit.

| Begriff | Für Nutzer:innen | Intern / redaktionelle Einordnung |
|---|---|---|
| Collection / Projekt | Der eine sichtbare Projektkontext | `platform_projects` |
| Capability | Fachliche Arbeit innerhalb einer Collection | Produktbindung zu einer lokalen App |
| Binding | Nicht als eigenes Konzept erklären | Verbindung Collection ↔ lokales Produktprojekt |
| Knowledge Pack | Gemeinsamer, kuratierter Wissensstand | Collection-weite Facetten und veröffentlichte Produkt-Destillate |

**Nicht sagen:** „CHECKION-Projekt“, „AUDION-Projekt“ oder andere produkt-eigene Projektarten. Wenn eine App noch „Project“ anzeigt, im Tutorial als lokaler Capability-Datensatz derselben Collection einordnen.

Primärquelle: [`specs/domain/collection-projects.md`](../../specs/domain/collection-projects.md).

## 2. App-Landkarte

| Bereich | Rolle in der Suite | Geeignete Marketing- und Tutorialfrage | Statushinweis |
|---|---|---|---|
| **PLEXON** | Collection-Hub, gemeinsames Wissen, Capability-Übergaben, Assistant und Flows | „Wie behalte ich einen fachübergreifenden Projektkontext?“ | Produktkern |
| **CHECKION** | Page-, Domain-, SEO- und GEO-Prüfungen | „Was ist auf der Website problematisch, wiederkehrend oder in KI-Antworten unsichtbar?“ | Tutorialreif für die ersten fünf Einstiege |
| **AUDION** | Zielgruppen, Personas, Journeys und synthetische Forschung | „Für wen entwerfen wir und was erleben diese Menschen?“ | Vor Aufnahme Live-/Demo-Zustand prüfen |
| **BRANDION** | Markenwissen, Guideline, Tokens sowie visuelle/sprachliche Prüfung | „Entspricht diese Arbeit der Marke?“ | Kernflows erst durchklicken |
| **CREATION** | Compositions, Seiten und redaktionelle/visuelle Ausspielung | „Wie wird aus Erkenntnissen ein gestalteter Output?“ | Collection-Kontext und Editor prüfen |
| **SPIRION** | Recherche- und Referenzintelligenz für Design | „Welche visuellen Referenzen helfen vor dem Entwurf?“ | Als Integration bzw. Capability erklären; keine Produktprojekt-Erzählung |
| **ECHON** | Signale, Waves, Foresight und Research Briefings | „Welche Marktbewegung sollten wir verstehen?“ | Companion, nicht Teil der fünf Capability-Mirrors |
| **VIDEON** | Video-Analyse und semantische Medienarbeit | „Wie wird Video durchsuchbar und wiederverwendbar?“ | Nur als Roadmap/Vorschau behandeln, bis aktiv integriert |
| **BrandChecker2** | Vorgänger-/Legacy-Werkzeug | Nicht als neue Suite-Reise positionieren | Legacy |

Die fünf capability-gespiegelten Produktbereiche einer neuen Collection sind: **CHECKION, AUDION, BRANDION, CREATION und SPIRION**. ECHON ist ein eigenständiger Research-Companion. Diese Trennung ist wichtig, damit die Kommunikation keine falsche Produktarchitektur behauptet.

## 3. Erzählung der Suite

Die überzeugendste Suite-Erzählung folgt nicht den Apps, sondern einer Entscheidungskette:

```text
Marktbewegung (ECHON)
        ↓
Zielgruppe und Journey verstehen (AUDION)
        ↓
Erlebnis und Sichtbarkeit prüfen (CHECKION)
        ↓
Marke absichern (BRANDION)
        ↓
Inhalte und Flächen gestalten (CREATION)
        ↓
Kontext, Wissen und Übergaben erhalten (PLEXON Collection)
```

SPIRION kann vor CREATION als Referenzquelle auftreten. Nicht jeder Ablauf braucht alle Apps; eine glaubwürdige Suite Journey beginnt mit einem realen Problem und bindet nur die Capabilities ein, die es lösen.

## 4. CHECKION: geprüfte Einstiegsstory

CHECKION ist für die erste Content-Welle der stabilste Startpunkt.

| Schritt | Funktion | Richtige Aussage |
|---:|---|---|
| 1 | Workspace / New scan | Ein Scan wird im Kontext einer Collection vorbereitet. |
| 2 | WCAG Quick single scan | Eine einzelne URL wird geprüft; Ergebnis und Jobstatus danach in der App verfolgen. |
| 3 | WCAG Deep scan | Mehrere Seiten bilden einen Corpus; systemische Muster sind wichtiger als Einzelfehler. |
| 4 | SEO crawl | Signale und Abdeckung zu Titeln, Metadaten, Überschriften und Corpus prüfen; kein Ranking-Versprechen. |
| 5 | GEO Model memory | Ungestützte Modellkenntnis über eine Marke messen; getrennt von Live Search auswerten. |

Unverhandelbare CHECKION-Regeln:

- Läufe sind asynchron: Start ist nicht gleich Ergebnis.
- Nur Domains crawlen, für die eine Freigabe besteht.
- **Model memory** und **Live search** sind zwei getrennte GEO-Schichten; Trefferquoten niemals vermischen.
- Der aktuelle Sichtungs-Workspace heißt `PLEXON Tutorial Demo`; sichtbare Platzhalter-URLs nie als echte Testempfehlung übernehmen.

## 5. Inhaltliche Leitplanken

| Kennzeichnung | Wann verwenden | Beispiel |
|---|---|---|
| **Live** | Ein Ergebnis wird in der Zielumgebung tatsächlich erzeugt und gespeichert. | „Der Lauf ist abgeschlossen und in Jobs sichtbar.“ |
| **Demo** | Der Ablauf ist echt, arbeitet aber mit kontrollierten Beispieldaten. | „Wir nutzen diese freigegebene Testdomain.“ |
| **Fixture** | Ergebnis ist vorbereitet. | „Dieses Ergebnis ist zur Erklärung vorproduziert.“ |
| **Geplant** | Produktidee/Roadmap ohne gesicherte Zielumgebung. | „Vorschau, noch keine Anleitung.“ |

Keine Kennzeichnung weglassen, wenn eine Aufnahme nicht vollständig live ist. Keine Claims zu Genauigkeit, Zeitersparnis, Rankings oder KI-Qualität ohne belastbaren Nachweis.

## 6. Technische und redaktionelle Spielregeln

- Zuerst Spezifikation aktualisieren, dann Verhalten ändern.
- Shared UI aus `@msqdx/ui` nutzen; keine neuen app-lokalen Ersatzkomponenten in Produktarbeit empfehlen.
- Keine festen URLs oder Service-Basen in Code oder Anleitung erfinden. Kanonische Pfade stehen in [`knowledge/paths.md`](../paths.md).
- Produktive PLEXON-Deployments gehören zu `chbrdk/PLEXON`, nicht zu diesem Island-Repository.
- UI-Rebuilds: modernisieren, nicht alte Oberflächen nur kosmetisch überziehen. Referenz: [`knowledge/ui-rebuild-reuse.md`](../ui-rebuild-reuse.md), falls vorhanden.

## 7. Verbindliche Quellen vor Arbeit an einem Thema

| Thema | Zuerst lesen |
|---|---|
| Collections / Projektlogik | `specs/domain/collection-projects.md` |
| Produkt-Routen und Integrationen | `knowledge/paths.md` |
| UI-/Informationsarchitektur | `specs/domain/ui-migrate.md` plus passende Teil-Spezifikation |
| Gemeinsames Wissen | `specs/domain/collection-knowledge-pack.md` und `specs/api/collection-knowledge-pack.md` |
| Flows zwischen AUDION und CHECKION | `specs/domain/collection-test-flow.md` |
| Capability-Katalog und Automation | `specs/domain/capability-catalog.md` |
| Tutorial-Programm | `knowledge/tutorials/program.md` |

