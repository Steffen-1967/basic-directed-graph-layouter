# mylife-app

Prozessvisualisierungs-Tool mit TypeScript/Canvas für komplexe gerichtete Graphen.

## Dokumentation
- **Projektbeschreibung & Status:** `./GEMINI.md`
- **Layout-Algorithmus & Routing:** `./layouter.md`
- **Laufzeitumgebung:** `./environment.md`

## Features

### Visualisierung & Interaktion
- ✅ Interaktive Szenarien-Auswahl (Dropdown)
- ✅ Auto-Zentrierung & Panning (Drag & Drop)
- ✅ Editierbarer Modus mit Toggle-Button (✏️ no/yes)
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
- ✅ JSON-Reihenfolge-Kontrolle: Vertikale Anordnung der Prozessbäume durch Reihenfolge der Wurzelknoten im JSON-Array steuerbar

### Undo/Redo & Persistenz
- ✅ Command-Pattern-basiertes Undo/Redo-System
- ✅ LocalStorage-Persistierung ungespeicherter Änderungen
- ✅ Recovery-Dialog mit Timestamp-Vergleich
- ✅ Keyboard-Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
- ✅ In-Place-Editing von Node-Namen (Doppelklick)
- ✅ Dirty-Flag-Indikator im Header

### Multi-Tab & Server
- ✅ WebSocket-basiertes Multi-Tab-Locking
- ✅ Automatische Lock-Freigabe bei Tab-Schließung
- ✅ Read-Only-Modus bei Lock-Konflikten
- ✅ Padlock-Icon mit Status-Tooltip
- ✅ Express-Server mit REST-API (`/api/scenarios`, `/api/scenario/:name`)
- ✅ Statisches Serving von `/out` Verzeichnis

### Logging & Debugging
- ✅ Server-Logging mit täglicher Rotation (`logs/app_YYYY-MM-DD.log`)
- ✅ JSON-Format für strukturierte Logs
- ✅ Automatische Cleanup-Routine (7 Tage Aufbewahrung)
- ✅ Client-Logger mit Kategorie-Präfixen (`[WS]`, `[LOCK]`, `[API]`, etc.)
- ✅ Client-zu-Server-Logging via `POST /api/log`
- ✅ Playwright End-to-End Tests (14 Tests)

### Konfiguration & Architektur
- ✅ Zentrale Konfiguration in `manifest.js`
- ✅ Modularisierte Codebasis (Renderer, Layouter, Actions, History)
- ✅ TypeScript-Build-Prozess mit ts-node
- ✅ Nodemon für automatischen Server-Neustart

## Build & Run
```bash
npx ts-node src\index.ts
start out\graph.htm
```
