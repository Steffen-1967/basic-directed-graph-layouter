# Laufzeitumgebung

* NODE v.20.20.1
* NPM v.10.8.2

## Development and Test - Tools and Workflow

### Konsolen-Setup (2 Konsolen erforderlich)

**Konsole 1 (Aider/Development):**
- Hier arbeitest du mit Aider und führst Build-Befehle aus.
- **Workflow:** Seit der TypeScript-Migration erfolgt die Generierung in einem kombinierten Prozess.
- **Zentraler Befehl:** `npm run build:all`
  - Kompiliert alle `.ts` Dateien aus `/src` nach `/out` (via `tsc`).
  - Generiert die `out/graph.htm` und kopiert Assets (via `node out/index.js`).

**Konsole 2 (Server):**
- Hier läuft dauerhaft: `npm run server:dev`
- **nodemon** überwacht automatisch Änderungen an `server/server.js` und `server/routes/*.js`.
- Bei Änderungen startet der Server **automatisch neu**.
- Da der Server nun als **ES Module (ESM)** konfiguriert ist, nutzt er die moderne `import`/`export` Syntax.

### Test-Endpunkte

- **http://localhost:3000** - Hauptanwendung (lädt `out/graph.htm`)
- **http://localhost:3000/api/scenarios** - API-Test (Liste aller Szenarien)
- **http://localhost:3000/api/scenario/test-01.json** - API-Test (Einzelnes Szenario)

### API-Tests mit curl

**Voraussetzungen:**
- Server muss laufen (`npm run server:dev` in zweiter Konsole)
- `curl` muss installiert sein (in Windows 10+ standardmäßig vorhanden)

**Test-Befehle:**

```bash
# Liste aller Szenarien abrufen
curl http://localhost:3000/api/scenarios

# Einzelnes Szenario laden
curl http://localhost:3000/api/scenario/test-01.json

# Health-Check
curl http://localhost:3000/api/health
```

### Workflow nach Code-Änderungen

| Änderung an | Aktion | Browser |
|-------------|--------|---------|
| **Frontend-Code** (`src/*.ts`, `src/*.css`) | `npm run build:all` ausführen | Neu laden (F5) |
| **Server-Code** (`server/*.js`) | Automatischer Neustart durch nodemon | Neu laden (F5) |
| **JSON-Daten** (`data/*.json`) | Keine Aktion nötig | Neu laden (F5) |

### Technischer Stack & Modernisierung

**TypeScript & ESM:**
- Das Projekt wurde vollständig auf **TypeScript** migriert.
- Alle Module (Frontend & Server) verwenden nun **ES Modules (ESM)**.
- In `package.json` ist `"type": "module"` gesetzt.
- Browser-Scripte werden in `graph.htm` mit `type="module"` eingebunden.
- Imports in `.ts` Dateien müssen die Endung `.js` enthalten (z.B. `import { x } from './file.js'`), damit der Browser sie nach der Kompilation korrekt auflösen kann.

## Architektur & Konventionen

### State Management
- **Zentrales State-Objekt:** Alle globalen Variablen sind in `src/state.ts` als `AppState` definiert.
- **Single Source of Truth:** Niemals parallele Variablen außerhalb von `state` anlegen.
- **Zugriff:** Immer über `state.interaction.xyz`, `state.view.xyz`, etc.
- **Struktur:**
  - `state.scenario`: Aktuelles Szenario (Metadaten + Knoten)
  - `state.nodes`: Direkte Referenz auf `scenario.nodes` (für Performance)
  - `state.view`: Viewport-Transformation (offsetX, offsetY, zoom)
  - `state.interaction`: UI-Zustand (Hover, Selection, Editing)
  - `state.network`: WebSocket & Lock-Status
  - `state.isDirty`: Unsaved-Changes-Flag

### Event-Driven Architecture
- **Event-Bus:** Zentrale Event-Verwaltung in `src/state.ts` via `StateEventBus`.
- **Event-Typen:** Alle verfügbaren Events sind als `StateChangeEvent` Union-Type definiert.
- **Konvention:** Jede wichtige State-Änderung **muss** ein Event emittieren.
- **Format:** `stateEvents.emit({ type: 'EVENT_NAME', ...data })`
- **Verfügbare Events:**
  - `NODE_SELECTED`: Knoten wurde ausgewählt/deselektiert
  - `NODE_UPDATED`: Knoten-Property wurde geändert
  - `EDGE_SELECTED`: Kante wurde ausgewählt/deselektiert
  - `VIEW_CHANGED`: Viewport wurde verschoben/gezoomt
  - `EDIT_MODE_CHANGED`: Edit-Modus wurde umgeschaltet
  - `DIRTY_STATE_CHANGED`: Unsaved-Changes-Status hat sich geändert
  - `SCENARIO_LOADED`: Neues Szenario wurde geladen
  - `GRAPH_REFRESHED`: Layout wurde neu berechnet
  - `HOVER_CHANGED`: Hover-Zustand hat sich geändert

### Neue Features implementieren
1. **State erweitern:** Neue Properties in `src/state.ts` → `AppState` Interface hinzufügen.
2. **Event-Typ definieren:** Neuen Event-Typ in `src/state.ts` → `StateChangeEvent` Union hinzufügen.
3. **Event emittieren:** Nach jeder State-Änderung `stateEvents.emit(...)` aufrufen.
4. **Listener registrieren:** In `src/app.ts` via `stateEvents.subscribe(...)` auf Events reagieren.

### Beispiel: Neues Feature "Node Locked"
```typescript
// 1. State erweitern (src/state.ts)
export interface InteractionState {
    // ... existing properties
    lockedNodeId: string | null;
}

// 2. Event-Typ definieren (src/state.ts)
export type StateChangeEvent = 
    // ... existing types
    | { type: 'NODE_LOCKED', nodeId: string | null };

// 3. Event emittieren (src/app.ts)
function lockNode(nodeId: string) {
    state.interaction.lockedNodeId = nodeId;
    stateEvents.emit({ type: 'NODE_LOCKED', nodeId });
}

// 4. Listener registrieren (src/app.ts)
stateEvents.subscribe((event) => {
    if (event.type === 'NODE_LOCKED') {
        historyLogger.log('[EVENT] Node locked:', event.nodeId);
    }
});
```

### Playwright End-to-End Tests

**Voraussetzungen für Tests:**
1. **Konsole 1:** Server starten mit `npm run server:dev`
2. **Alle Browser-Tabs der Anwendung schließen** (http://localhost:3000)
3. **Konsole 2:** Tests ausführen mit `npx playwright test`

**Test-Ausführung:**
```bash
# Alle Tests ausführen
npx playwright test
```

### Server-Logging-System

**Konfiguration:**
- **Log-Verzeichnis:** `logs/`
- **Rotation:** Täglich
- **Format:** JSON
- **Aufbewahrung:** 7 Tage

### Multi-Tab-Verhalten & Locking

- **Lock-System:** Verhindert gleichzeitiges Editieren in mehreren Tabs.
- **Dirty-State:** Wird über die Undo/Redo-History ermittelt.
- **Recovery:** Automatische Wiederherstellung ungespeicherter Änderungen aus dem LocalStorage bei Systemabsturz oder versehentlichem Schließen.

## Datenmodell & Relationen

Das System verwendet ein explizites Modell für Verbindungen (Edges) zwischen Knoten, um Gewichtungen und andere Metadaten zu unterstützen.

### Relation-Struktur
Verbindungen werden in den Eigenschaften `predecessors` und `successors` eines Knotens gespeichert. Jede Verbindung ist ein Objekt vom Typ `Relation`:
```typescript
interface Relation {
    id: string;     // GUID des Ziel-/Quellknotens
    weight: number; // Gewichtung der Verbindung (Default: 1)
}
```

### JSON-Format (Beispiel)
```json
{
  "id": "node-guid-123",
  "name": "Beispiel Task",
  "predecessors": [
    { "id": "prev-node-guid", "weight": 1 }
  ],
  "successors": [
    { "id": "next-node-guid", "weight": 2 }
  ]
}
```

### Logik-Regeln
1. **Vererbung:** Bei der automatischen Berechnung von `successors` (via `evolveSuccessors`) wird die Gewichtung aus dem entsprechenden Eintrag in `predecessors` übernommen.
2. **Fallback:** Fehlt die Gewichtung in den Daten, wird standardmäßig `1` angenommen.
3. **Persistenz:** Die `DeleteNodeAction` sorgt dafür, dass Gewichtungen beim Überbrücken von gelöschten Knoten erhalten bleiben.

## Icon-System (Lucide)

Das Projekt verwendet **Lucide Icons** für eine konsistente und professionelle UI. Die Bibliothek wird lokal über `node_modules` eingebunden.

### Technische Einbindung
1. **Bibliothek:** Die Datei `lucide.min.js` wird beim Build-Prozess (`npm run build:all`) automatisch von `node_modules/lucide/dist/umd/` nach `/out` kopiert.
2. **HTML:** Die Einbindung erfolgt statisch in `src/index.ts` über ein `<script src="lucide.min.js">` Tag.
3. **Initialisierung:** Am Ende des HTML-Dokuments wird `lucide.createIcons()` beim `DOMContentLoaded` Event aufgerufen.

### Nutzung im HTML (Statisch)
Icons werden über das `data-lucide` Attribut an einem Element (vorzugsweise `<i>`) definiert:
```html
<button id="loadBtn"><i data-lucide="file-digit"></i> Load</button>
```

### Nutzung in TypeScript (Dynamisch)
Bei dynamischen DOM-Änderungen (z.B. Ändern des Schloss-Icons) muss `lucide.createIcons()` manuell aufgerufen werden, um die Platzhalter in SVGs umzuwandeln:
```typescript
function updateIcon(nodeId: string, iconName: string) {
    const element = document.getElementById(nodeId);
    if (element) {
        element.innerHTML = `<i data-lucide="${iconName}"></i>`;
        // @ts-ignore (lucide is global via script tag)
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}
```

### Design-Standards & CSS
Um ein einheitliches Erscheinungsbild zu gewährleisten, gelten folgende Standards (definiert in `src/app.css`):
- **Größe:** `16px x 16px` (Selektor: `svg.lucide`).
- **Strichstärke:** `2px` (`stroke-width: 2px`).
- **Abstand:** In Buttons wird ein `gap` von `8px` verwendet.
- **Alignment:** Buttons nutzen `display: inline-flex` und `align-items: center`.

---
[End of environment.md]
