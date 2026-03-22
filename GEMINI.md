# Project: mylife-app

## Mission
Ein TypeScript-Programm, das eine Prozessvisualisierung als HTML-Seite (`graph.htm`) im Verzeichnis `/out` generiert. Das System unterstützt komplexe gerichtete Graphen inklusive Rückschleifen (Zyklen) und bietet interaktive Funktionen im Browser.

## Tech Stack
- TypeScript / Node.js
- HTML Canvas API
- ts-node

## Konventionen & Architektur
- **Ausgabe:** Alle generierten Dateien landen in `/out`. Die Hauptdatei ist `graph.htm`.
- **Build-Prozess:** Änderungen werden nur in `/src` vorgenommen. Dateien in `/out` werden durch `npx ts-node src\index.ts` neu generiert.
- **Datenquelle:** Dynamisches Einlesen aller `.json` Dateien aus `/data`.
- **Logik-Trennung:** 
    - `src/index.ts`: Generiert das HTML und bettet rohe JSON-Daten ein.
    - `src/manifest.js`: Enthält die zentrale Konfiguration (`CONFIG`) und die JSDoc-Definition des `ProcessNode`.
    - `src/layouterCalculate.js`: Enthält die gesamte Geschäftslogik (Validierung, Nachfolger-Berechnung, Layout-Algorithmus). Läuft im Browser.
    - `src/renderer.js`: Enthält die Canvas-Zeichenlogik.
- **Sprache:** Quellcode-Kommentare in Englisch. Dokumentation in Deutsch oder Englisch.

## Aktueller Status
- **Modularisierung:** Die gesamte Layout- und Validierungslogik ist in `layouterCalculate.js` gekapselt und wird vom Browser ausgeführt.
- **Struktur:** `ProcessNode` ist als JSDoc-Typedef in `manifest.js` manifestiert.
- **Beziehungen:** `successorIds` werden zur Laufzeit über `evolveSuccessors` berechnet.
- **UI:** Interaktive Szenarien-Auswahl, Auto-Zentrierung und persistenter Edit-Modus mit Handles (bleiben beim Drag sichtbar).

## Changelog
### 2026-03-22 (Fortsetzung 5) - Server-Logging-System
- **Feature:** Server-Logger-Klasse (`server/logger.js`) mit täglicher Rotation
  - Automatische Erstellung von `logs/app_YYYY-MM-DD.log`
  - JSON-Format: `{timestamp, level, category, message, details}`
  - Cleanup-Routine beim Start (löscht Logs älter als 7 Tage)
- **Feature:** Client-Logger-Klasse (`src/logger.js`) mit Kategorie-Präfixen
  - Instanzen: `wsLogger`, `lockLogger`, `apiLogger`, `historyLogger`
  - Methoden: `log()`, `warn()`, `error()`, `child()`
- **Feature:** Client-Endpoint `POST /api/log` für Browser-zu-Server-Logging
- **Refactoring:** Alle `console.*` Aufrufe durch Logger-Instanzen ersetzt
  - Client: `src/index.ts` (WebSocket, Lock, API, History)
  - Server: `server/server.js`, `server/routes/scenarios.js`
- **Refactoring:** Präfix-Standardisierung in allen Modulen
  - `[WS]`, `[LOCK]`, `[API]`, `[HISTORY]`, `[ACTION]`, `[LAYOUT]`, `[WARN]`
- **Refactoring:** Erweiterte Fehlermeldungen mit Kontext und Diagnose-Hinweisen
- **Testing:** Log-Datei erfolgreich erstellt und verifiziert (`logs/app_2026-03-22.log`)
- **Dokumentation:** Vollständige Beschreibung in `environment.md`
- **Dokumentation:** Phase 9 (Server-Logging) als "Abgeschlossen" markiert

### 2026-03-22 (Fortsetzung 4)
- **Feature:** WebSocket-basiertes Multi-Tab-Locking vollständig implementiert
- **Feature:** Automatische Lock-Freigabe bei Tab-Schließung/Disconnect
- **Feature:** Lock-Status-Broadcast an alle verbundenen Clients
- **Feature:** Recovery-Dialog mit Timestamp-Vergleich und Konflikt-Warnung
- **Testing:** Playwright End-to-End Tests für Lock-System (14 Tests, alle bestanden)
- **Dokumentation:** Phase 7 (Server-Infrastruktur) als "Abgeschlossen" markiert

### 2026-03-22 (Fortsetzung 3)
- **Feature:** Mini-Server Setup mit Express (Port 3000)
- **Feature:** API-Routen für Szenarien (`GET /api/scenarios`, `GET /api/scenario/:name`)
- **Feature:** Statisches Serving von `/out` Verzeichnis
- **Dokumentation:** Phase 7 (Server-Infrastruktur) gestartet

### 2026-03-22 (Fortsetzung 2)
- **Robustheit:** Defensive Checks in `updateHoverState()` gegen Race-Conditions (hoveredNode/editingNode-Validierung).
- **Robustheit:** Action-Validierung in `DeleteNodeAction.execute()` mit Warnungen bei inkonsistenten Zuständen.
- **Dokumentation:** Neuer Abschnitt "Race-Conditions & Fehlerbehandlung" in `undo-redo-plan.md` mit Hinweisen zu Async-Operationen und Multi-Tab-Szenarien.
- **Dokumentation:** Implementierungsreihenfolge aktualisiert mit Phase 7 (Multi-Tab-Locking, Debug-Panel).

### 2026-03-22 (Fortsetzung)
- **Refactoring:** GUID-Sortierung entfernt - Wurzelknoten werden nun in JSON-Reihenfolge verarbeitet, um User-Kontrolle über die vertikale Anordnung zu ermöglichen.
- **Dokumentation:** `layouter.md` aktualisiert mit Hinweis zur JSON-Reihenfolge-Kontrolle.

### 2026-03-22 (Fortsetzung 4)
- **Dokumentation:** Playwright-Setup in `environment.md` dokumentiert (Installation, Konfiguration, Test-Ausführung).
- **Cleanup:** Veraltete Dateien `src\render.js` und `out\render.js` aus Git-Repository entfernt (Git-Commit 8c76567).
  - **Wichtig:** Diese Dateien existieren nicht mehr! Nur `src\renderer.js` wird verwendet.

### 2026-03-22
- **Refactoring:** ID-Typ von `number` auf `string` (GUID) umgestellt in allen Dateien und Datensätzen.
- **Cleanup:** Duplikate `out\render.js` und `src\renderer.js` entfernt - nur noch `src\renderer.js` existiert und wird nach `out\` kopiert.

### 2026-03-21 (Fortsetzung 3)
- **UI/UX:** Automatisches Entfernen der Marker (Handles) beim Start des In-Place-Editings zur Vermeidung von visuellen Irritationen.
- **UI/UX:** Implementierung eines globalen Maus-Trackings (`lastMouseX`, `lastMouseY`) zur präzisen Status-Aktualisierung.
- **Refactoring:** Extraktion der Hover- und Tooltip-Logik in eine zentrale Funktion `updateHoverState` in `src/index.ts`.
- **UI/UX:** Sofortige Re-Aktivierung der Handles beim Verlassen des Editiermodus (Enter, Blur, Escape) unter Berücksichtigung der aktuellen Mausposition.
- **Bugfix:** Korrektur der Tooltip-Positionierung und Behebung von TypeScript-Compilerfehlern bei der HTML-Generierung (Template-Literal Escaping).

### 2026-03-21 (Fortsetzung 2)
- **Feature:** In-Place-Editing des "name" Properties im Edit-Modus (Doppelklick).
- **Feature:** HTML-Overlay (`<textarea>`) für intuitive Texteingabe mit Browser-nativen Features (Caret, Copy-Paste, Wrapping).
- **Feature:** Dirty-Flag `nodes.isDirty` zur Verfolgung ungespeicherter Änderungen mit UI-Indikator im Header.
- **Refactoring:** Zentrale Synchronisation von Overlay-Padding und Positionierung via `OVERLAY_PADDING` in `src/index.ts`.
- **UI:** Dynamische Positionierung der Textbox basierend auf Knotentyp und Panning-Offset.

### 2026-03-21 (Fortsetzung 1)
- **Refactoring:** `getNodeBoundingBox` in `calculateNodeBoundingBox` umbenannt (src/renderer.js, src/index.ts).
- **Refactoring:** Logik zur Handle-Index-Berechnung aus `drawUnifiedArrow` in neue Funktionen `calculateSourceHandle` und `calculateTargetHandle` extrahiert.
- **Feature:** Intelligente Handle-Wahl: Wenn ein Knoten weniger als 2 Ein-/Ausgänge hat, wird automatisch der mittlere Handle (Index 2) verwendet.
- **Bugfix:** Handles im Edit-Modus bleiben nun während des Draggings/Pannings sichtbar (Verschiebung der Zeichenlogik in `renderAll`).
- **Feature:** Neue Funktion `evolveSuccessors` in `layouterCalculate.js` berechnet Nachfolger-IDs aus Vorgänger-IDs.
- **Refactoring:** `ProcessNode`-Interface aus `src/index.ts` entfernt und als JSDoc-Typedef in `src/manifest.js` manifestiert.
- **Refactoring:** Umfassende Modularisierung: Logik-Funktionen (`validateAndTransformGraph`, `calculateLayout`, `calculateGraphBoundings`) in `src/layouterCalculate.js` zentralisiert.
- **Refactoring:** Layout-Berechnung findet nun vollständig Client-seitig im Browser statt; `index.ts` liefert nur noch Rohdaten.
- **Feature:** SubProcess-Typ hinzugefügt (Rechteck mit doppelter Randstärke und Plus-Symbol im unteren Rechteck)
- **Refactoring:** CONFIG in `src/manifest.js` ausgelagert.

### 2026-03-20
- **Feature:** Dynamische Canvas-Größe und Editierbarer Modus mit Handles.
- **Refactoring:** `renderer.js` Modularisierung und JSDoc-Erweiterung.

## Verwandte Dokumentation
- **Layout-Algorithmus & Kanten-Routing:** Siehe `./layouter.md`
- **Laufzeitumgebung:** Siehe `./environment.md`

## Technische Details

### JSON-Datenstruktur (Manifestiert in manifest.js)
```javascript
/**
 * @typedef {Object} ProcessNode
 * @property {string} id - Unique identifier (GUID)
 * @property {'Event' | 'Task' | 'Rule' | 'SubProcess'} type
 * @property {string} name
 * @property {string[]} predecessorIds - Array of GUIDs
 * @property {string[]} successorIds - Array of GUIDs
 * @property {string} [description]
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [level]
 * @property {boolean} [isTopRow]
 */
```

### Konstanten & Konfiguration
Zentrale Steuerung über `CONFIG` in `src/manifest.js` (Farben, Größen, Abstände).

## Nächste Schritte
- [ ] **Handle-Interaktion:** Drag & Drop von Corner-Handles (Resize) und Anchor-Handles (Verbindungen)
- [ ] **Knoten-Verschiebung:** Drag & Drop von Knoten im editierbaren Modus mit JSON-Update
- [ ] **Verbindungen erstellen:** Drag von Anchor-Handle zu Anchor-Handle zum Erstellen neuer Kanten
- [ ] **Auto-Routing:** Vermeidung von Knotenüberschneidungen durch Kanten
- [ ] **Zoom-Funktionalität:** Mausrad-Zoom
- [ ] **Export:** SVG/PNG Download-Funktion
