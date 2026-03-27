# mylife-app

Prozessvisualisierungs-Tool mit TypeScript/Canvas für komplexe gerichtete Graphen.

## Dokumentation
- **Projektbeschreibung & Status:** `./GEMINI.md`
- **Layout-Algorithmus & Routing:** `./layouter.md`
- **Laufzeitumgebung:** `./environment.md`

## Features

### Visualisierung & Interaktion
- ✅ Interaktive Szenarien-Auswahl mit Klarnamen-Anzeige
- ✅ Auto-Zentrierung & Panning (Drag & Drop)
- ✅ Editierbarer Modus mit Toggle-Button (✏️ no/yes)
- ✅ Dynamisches visuelles Feedback: Canvas-Schatten ändert sich (Gelb=Edit, Grau=Read-Only)
- ✅ Benutzerdefinierte CSS-Modale ("Ja"/"Nein") statt Browser-Standard-Dialoge
- ✅ Corner-Handles & Anchor-Handles beim Hover (12 Anker pro Knoten)
- ✅ Typabhängige Anchor-Positionierung (Event/Rule berühren Form)
- ✅ Intelligente Tooltips (Name + Description, max. 260px)
- ✅ Dynamische Canvas-Größe (Bounding Box + Margins)
- ✅ Rückschleifen-Support (Zyklen im Graphen)
- ✅ Cursor-Feedback (move/default je nach Kontext)
- ✅ SubProcess-Typ mit Plus-Symbol und doppelter Randstärke
- ✅ Hover-Effekt für Anchor-Handles (hellblau)
- ✅ Erweiterte Hover-Fläche im Edit-Modus (10px Expansion)
- ✅ 4 Knotentypen: Event, Task, Rule, SubProcess
- ✅ Knoten-Toolbox für Schnellaktionen (Farbe, Löschen, Eigenschaften)
- ✅ Color-Picker mit 8 vordefinierten Farbschemata

### Undo/Redo & Persistenz
- ✅ Command-Pattern-basiertes Undo/Redo-System
- ✅ LocalStorage-Persistierung ungespeicherter Änderungen inklusive Szenario-Metadaten
- ✅ Recovery-Dialog mit Timestamp-Vergleich und Warnung bei Server-Konflikten
- ✅ In-Place-Editing von Node-Namen (Doppelklick)
- ✅ Dirty-Flag-Indikator im Header

### Datenstruktur & API
- ✅ Erweiterte JSON-Struktur (`TaskCollectionScenario`) mit Metadaten (`scenarioName`, `layoutType`)
- ✅ Abwärtskompatibilität für alte JSON-Formate
- ✅ Express-Server mit REST-API (`/api/scenarios`, `/api/scenario/:name`)
- ✅ Statisches Serving von `/out` Verzeichnis
- ✅ Automatisierte Daten-Migration via Skript


### Logging & Debugging
- ✅ Server-Logging mit täglicher Rotation (`logs/app_YYYY-MM-DD.log`)
- ✅ JSON-Format für strukturierte Logs
- ✅ Automatische Cleanup-Routine (7 Tage Aufbewahrung)
- ✅ Client-Logger mit Kategorie-Präfixen (`[WS]`, `[LOCK]`, `[API]`, etc.)
- ✅ Client-zu-Server-Logging via `POST /api/log`
- ✅ Playwright End-to-End Tests (14 Tests)

### Konfiguration & Architektur
- ✅ Zentrale Konfiguration in `src/manifest.ts`
- ✅ Modularisierte Codebasis (Renderer, Layouter, Actions, History, State)
- ✅ TypeScript-Build-Prozess mit `tsc`
- ✅ Nodemon für automatischen Server-Neustart
- ✅ Zentrales State-Management (`src/state.ts`)
- ✅ Event-Driven Architecture mit `StateEventBus`

## Build & Run
```bash
npx ts-node src\index.ts
start out\graph.htm
```
