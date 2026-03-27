# Project: mylife-app

## Mission
Ein TypeScript-Programm, das eine Prozessvisualisierung als HTML-Seite (`graph.htm`) im Verzeichnis `/out` generiert. Das System unterstützt komplexe gerichtete Graphen inklusive Rückschleifen (Zyklen) und bietet interaktive Funktionen im Browser.

## Tech Stack
- **TypeScript** (Frontend & Build-Logic)
- **Node.js** (Server & Build-Runner)
- **ES Modules (ESM)** (Konsistenter Standard für Client und Server)
- HTML Canvas API

## Konventionen & Architektur
- **Ausgabe:** Alle generierten Dateien landen in `/out`. Die Hauptdatei ist `graph.htm`.
- **Build-Prozess:** Änderungen werden in `/src` vorgenommen. Kompilation und Generierung via `npm run build:all`.
- **Datenquelle:** Dynamisches Einlesen aller `.json` Dateien aus `/data`.
- **Logik-Trennung:** 
    - `src/index.ts`: Orchestriert den Build-Prozess, generiert das HTML-Gerüst.
    - `src/app.ts`: Zentrale Client-Logik (Event-Listener, Initialisierung, UI-Steuerung).
    - `src/app.css`: Zentrale Stylesheets.
    - `src/manifest.ts`: Zentrale Typ-Definitionen und Konfiguration.
    - `src/layouterCalculate.ts`: Optimierte Layout-Algorithmen (Original-Logik aus JS migriert).
    - `src/renderer.ts`: Canvas-Zeichenlogik und präzises Kanten-Routing.
- **Icon-Standards (Lucide):**
    - **Größe:** Alle Icons einheitlich auf `16px x 16px` (CSS: `svg.lucide`).
    - **Strichstärke:** `2px`.
    - **Abstand:** In Buttons ein `gap` von `8px` zwischen Icon und Text.
- **Sprache:** Quellcode-Kommentare in Englisch. Dokumentation in Deutsch oder Englisch.

## Aktueller Status
- **Vollständige TypeScript-Migration:** Alle `.js` Dateien in `/src` wurden nach `.ts` portiert.
- **ESM-Standard:** Das Projekt nutzt nun durchgehend ES Modules.
- **Layout-Erweiterung:** Neuer `tree` Layout-Typ mit `switchToListLevel` Unterstützung.
- **Optimierte Kanten-Interaktion:** Neues Overlay für Kantengewichte mit Bestätigungs-Workflow.
- **Präzises Action-Modell:** Trennung von Knoten- und Kanten-Updates für saubereres Undo/Redo.

## Strategie für Robustheit & Wartbarkeit
Um versehentliche Fehler bei Erweiterungen zu minimieren, verfolgen wir diese 6 Punkte:
1.  ✅ **TypeScript Migration:** Statische Typisierung zur Vermeidung von Laufzeitfehlern.
2.  ✅ **Zentrales State-Objekt:** Konsolidierung aller globalen Variablen in einer "Single Source of Truth" (`src/state.ts`).
3.  ✅ **Event-gesteuerte Architektur:** Entkoppelung der UI von der Logik durch Messaging.
4.  ✅ **Typed Relations:** Explizite `Relation`-Objekte statt GUID-Strings für skalierbare Kanten-Metadaten.
5.  [ ] **Inversion of Control (IoC):** Dependency Injection für Services (Renderer, Layouter) statt Zugriff auf globale Variablen.
6.  [ ] **Modularisierung (Service-Pattern):** Aufteilung der `app.ts` in spezialisierte Service-Klassen.

## Changelog
### 2026-03-26 (Fortsetzung) - Tree Layout & Multi-Layout Support
- **Feature:** Einführung des `tree` Layout-Typs für hierarchische Darstellungen.
- **Layout-Logik:** Implementierung von `calculateTreeLayout` in `src/layouterCalculate.ts`.
- **Anpassbarkeit:** Unterstützung für `switchToListLevel` in `layoutPreferences`, um ab einer bestimmten Ebene von horizontaler auf vertikale (Listen-)Anordnung umzuschalten.
- **Typisierung:** Erweiterung der `TaskCollectionScenario` und `LayoutPreferences` Interfaces in `src/manifest.ts`.

### 2026-03-26 - Edge Weighting & Action Refactoring
- **Feature:** Implementierung des `edgeWeightOverlay` für den "Change edge behavior" Button.
- **UI:** Numerischer Spinner (1-10) mit [OK] und [Abbruch] Buttons inklusive Lucide Icons (`check`, `x`).
- **Refactoring:** Aufteilung der `UpdatePropertyAction` in spezialisierte Klassen:
    - `UpdateNodePropertyAction`: Für direkte Knoten-Eigenschaften (Name, Farbe).
    - `UpdateEdgePropertyAction`: Für chirurgische Updates von Kanten-Metadaten (synchronisiert `successors` und `predecessors`).
- **UX:** Änderungen an Kantengewichten werden erst beim Klick auf [OK] in die History (Undo/Redo) aufgenommen, um Spam bei Spinner-Interaktion zu vermeiden.

### 2026-03-25 (Fortsetzung 2) - Relation Model & Weighting
- **Migration:** Umstellung von `predecessorIds/successorIds` (Strings) auf `predecessors/successors` (Objekt-Array).
- **Datenstruktur:** Einführung des `Relation` Interface (`{ id: string, weight: number }`) für gewichtete Verbindungen.
- **Logik:** `evolveSuccessors` vererbt nun Gewichtungen; `DeleteNodeAction` bewahrt Gewichte beim Überbrücken.
- **Interaktion:** Anpassung der Hover- und Selektionslogik an die neue Objektstruktur.

### 2026-03-25 (Fortsetzung 1) - Icon-System Migration (Lucide)
- **Migration:** Umstellung von Emojis auf **Lucide Icons** (`npm install lucide`).
- **Build-Integration:** Automatisches Kopieren der `lucide.min.js` nach `/out` via `src/index.ts`.
- **Styling:** Zentrale Steuerung der Icon-Größen (16px) und Abstände (8px Gap) in `src/app.css`.

### 2026-03-25 - State Management & Event-Driven Architecture
- **State-Refactoring:** Einführung eines zentralen `AppState`-Objekts in `src/state.ts`.
- **Event-Bus:** Implementierung eines Event-gesteuerten Systems (`StateEventBus`) für entkoppelte Kommunikation.
- **Event-Typen:** Vollständige Typisierung aller State-Change-Events (NODE_SELECTED, EDGE_SELECTED, HOVER_CHANGED, etc.).
- **Robustheit:** Eliminierung globaler Variablen zugunsten der "Single Source of Truth".
- **Logging:** Integration des Event-Bus mit dem Logger für besseres Debugging.
- **Architektur:** Fortschritt bei Punkt 2 & 3 der Robustheitsstrategie (State-Objekt & Event-Driven).

### 2026-03-24 (Fortsetzung 2) - TypeScript & Stabilitäts-Update
- **Migration:** Vollständige Umstellung des Projekts auf **TypeScript**.
- **Modernisierung:** Umstellung auf **ES Modules (ESM)** für Frontend und Backend.
- **Build-Workflow:** Einführung von `npm run build:all` als zentralem Generierungs-Befehl.
- **Refactoring:** Korrektur der `HistoryManager`-Logik (Dirty-Status und automatische LocalStorage-Bereinigung).
- **Bugfixes:** 
  - Wiederherstellung der originalen, optimierten Layout- und Routing-Algorithmen aus Git.
  - Fix: Highlighting von Symbolen nur noch im `isEditable: yes` Modus.
  - Fix: Bereinigung veralteter Recovery-Daten bei Szenario-Wechsel.

### 2026-03-24 (Fortsetzung 1) - Präzise Klick-Verarbeitung
... [Bisheriger Inhalt bleibt] ...

### 2026-03-24 - Refaktoring & Daten-Update
... [Bisheriger Inhalt bleibt] ...

## Nächste Schritte
- [ ] **Zoom-Funktionalität:** Mausrad-Zoom für den Canvas.
- [ ] **Service-Pattern:** Refactoring von `app.ts` in spezialisierte Service-Klassen.
- [ ] **Eigenschafts-Dialog:** Implementierung von `handleEditProperties` für detaillierte Knoten-Metadaten.
- [ ] **Handle-Interaktion:** Drag & Drop von Corner-Handles (Resize) und Anchor-Handles (Verbindungen).
- [ ] **Unit Tests:** Absicherung der Layout-Logik gegen Regressionen.
