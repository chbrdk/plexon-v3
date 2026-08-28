# CHK-QS-01 — Neue Collection für CHECKION anlegen

## Tutorial-Steckbrief

| Feld | Inhalt |
|---|---|
| Format | Quick Start |
| Zieldauer | 2:30–3:30 Minuten |
| Zielgruppe | Neue PLEXON- und CHECKION-Nutzer:innen |
| Oberfläche | CHECKION `/projects` |
| Lernziel | Einen CHECKION Capability-Datensatz für eine Collection anlegen und den Workspace erkennen |
| Erfolg | Der neue Workspace öffnet sich und zeigt Name, Domain, Collection-Bindung sowie die nächsten Scan-Aktionen |

## Terminologie

Die aktuelle Oberfläche verwendet **New project**. Fachlich ist dies der lokale CHECKION-Datensatz einer PLEXON **Collection**.

Im Sprechertext verwenden wir deshalb:

> „Wir legen eine neue Collection für die Arbeit mit CHECKION an. CHECKION erstellt dafür seinen eigenen Capability-Datensatz.“

Wir sagen nicht, dass CHECKION ein von PLEXON unabhängiges Projektmodell besitzt.

## Voraussetzungen

- Nutzer:in ist angemeldet und darf Collections beziehungsweise CHECKION-Datensätze anlegen.
- Name und primäre Domain stehen fest.
- Die Aufnahmeumgebung wurde unmittelbar vor der Aufnahme geprüft.
- Für ein späteres Scan-Tutorial sollte eine freigegebene, kontrollierbare Demo-Domain verwendet werden.

## Beispieldaten

Für interne Proben:

| Feld | Beispiel |
|---|---|
| Name | PLEXON Tutorial Demo |
| Domain | example.com |
| Description | Beispiel-Collection für die CHECKION Tutorials. |

Für spätere Scan-Tutorials sollte `example.com` durch eine kontrollierbare Demo-Domain mit bewusst vorbereiteten Testfällen ersetzt werden. Keine fremde Website ohne Freigabe für Deep Scans verwenden.

## Beispielaufnahme

Der verifizierte Browser-Screencast des real angelegten Beispielprojekts liegt unter:

`knowledge/tutorials/assets/checkion-01-create-project.mp4`

- Dauer: 11,5 Sekunden
- Format: MP4/H.264
- Bildgröße: 1800 × 994 Pixel
- Ergebnis: Capability **In sync**, Collection-ID `f06a3c56-93d5-485e-85c4-61e2974d0cfe`

## Klickpfad

1. CHECKION öffnen.
2. In der linken Navigation **Projects** wählen.
3. Die erste Kachel **New project** öffnen.
4. Unter **Name** den Anzeigenamen eingeben.
5. Unter **Domain** den primären Hostnamen oder die URL eingeben.
6. Optional unter **Description** den Zweck ergänzen.
7. **Create** wählen.
8. Im geöffneten Workspace Name, Domain und Capability-/Collection-Status prüfen.

`Name` und `Domain` sind Pflichtfelder. **Create** bleibt deaktiviert, bis beide Felder befüllt sind. Die Beschreibung ist optional.

## Storyboard und Sprechertext

| Zeit | Bildschirmregie | Sprechertext | Einblendung |
|---:|---|---|---|
| 00:00 | CHECKION Projects in der Übersicht | „In diesem Quick Start legen wir den Arbeitskontext für eine Website in CHECKION an.“ | Neue Collection für CHECKION |
| 00:10 | Kurz auf bestehende Karten und Status „In sync“ zeigen | „Jede Karte ist der CHECKION-Datensatz einer PLEXON Collection. Hier sammeln sich später Einzelprüfungen, Domain-Crawls und GEO-Messungen.“ | Eine Collection · mehrere Prüfarten |
| 00:28 | **New project** öffnen | „Wir starten mit New project.“ | New project |
| 00:36 | Fokus auf **Name** | „Der Name ist die verständliche Bezeichnung, die später in der Übersicht erscheint.“ | Name · erforderlich |
| 00:52 | Fokus auf **Domain** | „Unter Domain tragen wir den primären Hostnamen oder eine vollständige URL ein.“ | Domain · erforderlich |
| 01:08 | Fokus auf **Description** | „Die Beschreibung ist optional. Sie hilft, Zweck oder Scope der Collection festzuhalten.“ | Description · optional |
| 01:24 | **Create** wird aktiv; klicken | „Sobald Name und Domain vollständig sind, erstellen wir den Datensatz.“ | Create |
| 01:38 | Neuer Workspace | „CHECKION öffnet direkt den Workspace. Oben sehen wir Name, Domain und die Bindung zur Collection.“ | Workspace prüfen |
| 01:55 | Corpus Pulse und leere Kapitel zeigen | „Zu Beginn sind die Bereiche noch leer. Hier erscheinen später Single Scans, Deep Scans und GEO Runs.“ | Single · Deep · GEO |
| 02:15 | CTA **New scan** hervorheben | „Der nächste sinnvolle Schritt ist ein erster WCAG-Scan. Genau dort machen wir im nächsten Tutorial weiter.“ | Als Nächstes: erster WCAG-Scan |

## Erwarteter Endzustand

Der Workspace zeigt mindestens:

- Collection-/Capability-Name
- primäre Domain
- Capability-Status
- Collection-ID oder lokale Bindungs-ID
- **New scan**
- **Open GEO** oder **Start GEO**
- Corpus Pulse mit anfangs leeren beziehungsweise nullwertigen Kapiteln

## Umgebungsvarianten

### Live Federation

CHECKION versucht den neuen Datensatz mit PLEXON zu registrieren und bindet die zurückgegebene Collection-ID. Nur wenn die Oberfläche anschließend **In sync** zeigt, darf der Sprechertext die erfolgreiche Suite-Bindung bestätigen.

### Dummy oder lokale Umgebung

Der CHECKION-Datensatz wird lokal angelegt. Das Tutorial darf dann nicht behaupten, dass die Collection bereits in anderen Apps verfügbar ist. Der Abschluss lautet stattdessen:

> „Der CHECKION-Arbeitsbereich ist lokal angelegt. Die Suite-Bindung erfolgt in einer live konfigurierten Umgebung.“

## Fehlerpfade

| Situation | Erklärung im Tutorial oder Help-Artikel |
|---|---|
| **Create** ist deaktiviert | Name oder Domain fehlt. Beide Felder sind erforderlich. |
| Create failed | Eingaben prüfen; bei weiterhin bestehendem Fehler Federation-/API-Status durch Administration prüfen lassen. |
| Status bleibt Pending | Datensatz wurde angelegt, aber die PLEXON-Bindung ist noch nicht abgeschlossen. Nicht als „In sync“ ausgeben. |
| Gleichnamiger Eintrag existiert | Vor der Aufnahme einen eindeutigen Tutorial-Namen verwenden. |
| Falsche Domain | Über **Edit** korrigieren, bevor ein Scan gestartet wird. |

## Aufnahmeplan

- 16:9-Aufnahme bei mindestens 1440 × 900
- Mausbewegungen ruhig und direkt; keine Suche oder bestehende Kundendaten hervorheben
- Bestehende reale Kundennamen nach Bedarf unscharf stellen oder eine bereinigte Demo-Umgebung verwenden
- Zoom auf Dialog und anschließend auf Workspace-Cover
- Einblendungen maximal fünf Wörter
- Keine Aussage zu AUDION-Mirrors oder anderen Apps, solange die Bindung nicht sichtbar verifiziert wurde

## QA vor Veröffentlichung

- [ ] Aktuelle Labels lauten Projects, New project, Name, Domain, Description und Create.
- [ ] Name und Domain sind weiterhin Pflichtfelder.
- [ ] Create führt auf den neuen Workspace.
- [ ] Capability-/Collection-Status wurde für die Aufnahmeumgebung geprüft.
- [ ] Keine realen personenbezogenen oder vertraulichen Kundendaten sind sichtbar.
- [ ] Live-, Demo- oder Fixture-Status ist im Begleittext korrekt angegeben.
- [ ] Der nächste Tutorial-Link verweist auf CHK-QS-02.

## Folgetutorial

**CHK-QS-02 — Ersten WCAG-Scan starten**

Startpunkt ist der soeben angelegte Workspace. Der Ablauf verwendet **New scan**, prüft genau eine freigegebene URL und endet auf der Ergebnisübersicht.
