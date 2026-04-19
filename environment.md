# Laufzeitumgebung

* NODE v.20.20.1
* NPM v.10.8.2
* Docker Desktop, docker v.29.3.1 und apache/age

## Schnellstart

### Server starten (1 Konsole erforderlich)

Das Projekt ist eine Next.js-Anwendung, die sowohl Frontend als auch Backend (API) in einem Prozess verwaltet.

**Anwendung starten:**
```powershell
npm run dev
```

**Datenbank (PostgreSQL mit Apache AGE) starten:**
Stelle sicher, dass Docker Desktop läuft.
```powershell
./XXX_run_PG_und_AGE.bat
```

### Anwendung öffnen

- Browser: **http://localhost:3001** (Standardport für Entwicklung)
- API-Status: **http://localhost:3001/api/age/scenarios**

---

## Development and Test - Tools and Workflow

### Konsolen-Setup

**Entwicklung:**
- `npm run dev` startet den Next.js Entwicklungsserver mit Hot-Reloading.
- Änderungen an `src/**/*.ts` oder `src/**/*.tsx` werden sofort im Browser reflektiert.

### Test-Endpunkte

- **http://localhost:3001** - Hauptanwendung
- **http://localhost:3001/api/age/scenarios** - Liste aller Szenarien aus PostgreSQL AGE
- **http://localhost:3001/api/fs/dataFiles** - Liste aller JSON-Dateien im Dateisystem

### Workflow nach Code-Änderungen

| Änderung an | Aktion | Browser |
|-------------|--------|---------|
| **Frontend/API** (`src/**/*`) | Hot-Reloading (automatisch) | Sofort aktiv |
| **JSON-Daten** (`data/*.json`) | Keine Aktion nötig | Neu laden (F5) |
| **Datenbank** | Batch-Skript ausführen | Neu laden (F5) |

### Technischer Stack & Modernisierung

**React & Next.js:**
- Das Projekt nutzt **Next.js 14+** (App Router) und **React 18**.
- Die gesamte UI ist in **TypeScript (TSX)** implementiert.
- Backend-Routen liegen unter `src/app/api/`.

## Datenbereinigung & Persistenz

### Bereinigungs-Funktionen
Das System verwendet eine zentrale Bereinigungs-Funktion für unterschiedliche Persistierungs-Szenarien:

1. **`cleanupEnvelopeForPersistence()` (in `LayoutEngine`):**
   - Entfernt Laufzeit-Eigenschaften: `x`, `y`, `level`, `isTopRow`
   - Entfernt alle Properties, die mit `_` beginnen (via JSON replacer)
   - Entfernt `edge.locked` von allen Kanten (incoming/outgoing), wenn `cleanEdges` wahr ist
   - Behält `node.locked` bei (repräsentiert Versionsstatus)
   - Wird sowohl für PostgreSQL AGE Persistierung als auch beim Speichern in JSON-Dateien verwendet


### Gesperrt-Status-Berechnung
Die zentrale Funktion `isLockedByVersionNumber(version, fallback)` in `manifest.ts`:
- Prüft ob eine Versionsnummer auf `.0` endet (Release-Status)
- Wird sowohl im Frontend (`LayoutEngine`) als auch im Backend (`usecases.ts`) verwendet
- Unterstützt einen optionalen Fallback-Wert für unbekannte Zustände

## Architektur & Konventionen

### State Management (StateManager)
Das System nutzt eine kontrollierte Zustandsverwaltung via `src/stateManager.ts`.
- **StateManager:** Kapselt den `AppState` und bietet Methoden für atomare Updates.
- **UI Command Queue (Event-Pipeline):** Um Race-Conditions bei komplexen UI-Übergängen (z.B. Wechsel von der Datenliste zum Wiederherstellungs-Modal) zu verhindern, nutzt der StateManager eine Promise-basierte Warteschlange (`executeUISequence`). Diese garantiert, dass asynchrone Aktionen (wie `closeOverlay` gefolgt von `openOverlay`) streng sequentiell und deterministisch abgearbeitet werden.
- **Referenz-Stabilität:** Methoden wie `setEnvelope` erzwingen neue Objekt-Referenzen (`{...envelope}`, `[...nodes]`), um React-Re-Renders zuverlässig auszulösen (essenziell für das erneute Laden desselben Datensatzes).
- **Zentrale Steuerung:** Alle UI-Zustände (Selektion, Overlays, Edit-Modus) werden ausschließlich über den `StateManager` geändert.

### Zentrale Overlay-Steuerung
Interaktive UI-Elemente (Editoren, Toolboxen, Modals) werden zentral über den `OverlayController` verwaltet.
- **OverlayType:** Alle Overlays sind in `src/state.ts` typisiert (z.B. `NodeToolbox`, `EdgeProperties`).
- **Positionierung:** Toolboxes nutzen `position: fixed` mit Koordinaten, die im `InteractionService` unter Berücksichtigung von Zoom und Canvas-Offset (BoundingClientRect) berechnet werden.
- **Backdrop-Logik:** Ein globaler, transparenter Layer fängt Klicks außerhalb der Overlays ab und schließt diese automatisch.
- **Z-Index:** Overlays liegen in einem dedizierten Layer (Z-Index 9000+), um Überlappungen zu vermeiden.

### Event-Driven Architecture
- **Event-Bus:** Zentrale Event-Verwaltung in `src/state.ts` via `StateEventBus`.
- **Event-Typen:** Alle verfügbaren Events sind als `StateChangeEvent` Union-Type definiert.
- **RENDER_REQUESTED:** Ein spezielles Event, das React signalisiert, den kompletten UI-Zustand neu aus den Services zu lesen.
- **Verfügbare Events:**
  - `NODE_SELECTED`, `EDGE_SELECTED`: Selektionsänderung
  - `UI_OVERLAY_CHANGED`: Overlay wurde geöffnet/geschlossen
  - `SCENARIO_LOADED`: Daten wurden erfolgreich geladen
  - `VIEW_CHANGED`: Viewport-Verschiebung
  - `EDIT_MODE_CHANGED`: Modus-Umschaltung

### Database (PostgreSQL / Apache AGE)
Das Backend nutzt PostgreSQL mit der Apache AGE Extension.
- **Daten-Mapping:** Der `GraphTransformer` (Server) und `LayoutEngine` (Client) sorgen für eine nahtlose Konvertierung zwischen Cypher-Ergebnissen und dem `Envelope`-Modell.
- **Layout-Persistenz:** Für AGE-Datensätze wird standardmäßig `ForceAtlas` als Layout erzwungen, sofern keine spezifische Konfiguration im Knoten vorliegt.
- **Lade-Sequenz:** Die Sequenz ist massiv stabilisiert und bewältigt Race-Conditions zwischen verschiedenen Overlays (z.B. DataList vs. RecoveryModal).

### Server-Logging & Client-Proxy
- **Logging-Proxy:** Client-Logs werden via `/api/log` an den Server gesendet.
- **Speicherung:** Logs werden in `logs/cli_*.log` (Client) und `logs/srv_*.log` (Server) gespeichert.
- **Rotation:** Die Log-Dateien werden täglich rotiert und im JSON-Format abgelegt.
- **Fehlersuche:** Der `ServerLogger` berechnet Pfade bei jedem Schreibvorgang neu, um maximale Robustheit zu gewährleisten.

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

### Envelope-Struktur (Single-Root mit Hierarchie)

Das aktuelle Datenmodell nutzt eine **Single-Root-Architektur**:

```typescript
interface Envelope {
    exporter: string;
    name: MultiLangProp;
    description: MultiLangProp;
    layoutType: 'Flow' | 'Box' | 'Tree' | 'ForceAtlas';
    layoutPreferences: LayoutPreferences;
    root: string;  // GUID des Root-Knotens
    nodes: GraphNode[];  // Array von Top-Level-Knoten
}
```

**Wichtige Konzepte:**
- `Envelope.nodes[]` ist ein **Array** und kann theoretisch mehrere Top-Level-Knoten enthalten
- Der Root-Knoten wird via `nodes.find(n => n.id === root)` identifiziert
- Die eigentlichen Prozess-Knoten liegen in `rootNode.nodes[]` (verschachtelt)
- **Veraltetes `roots[]` Property:** Wurde vollständig entfernt (Stand: 2026-04-01)

**Zentrale Hilfsfunktionen (in `manifest.ts`):**
```typescript
// Rekursive Iteration über alle Knoten
iterateAllNodes(envelope, (node, isRoot, depth) => {
    console.log(`Node: ${node.name.value}, Root: ${isRoot}, Depth: ${depth}`);
});

// Alle Knoten in flaches Array sammeln
const allNodes = collectAllNodes(envelope);

// Root-Knoten direkt finden
const rootNode = findRootNode(envelope);
```

**Best Practices:**
- **Niemals** manuell `state.envelope.nodes.find(n => n.id === state.envelope.root)` verwenden
- **Immer** die zentralen Funktionen `findRootNode()` oder `collectAllNodes()` nutzen
- **Für Iterationen:** `iterateAllNodes()` mit Callback-Pattern verwenden

### GraphEdge-Struktur (Verbindungen zwischen Knoten)

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

*   **Quelle:** [Lucide GitHub](https://github.com/lucide-icons/lucide) / NPM `lucide`
*   **Lizenz:** ISC License (freie Nutzung in privaten und kommerziellen Projekten, erfordert Auslieferung des Copyleft)

### Technische Einbindung
1. **Bibliothek:** Die Datei `lucide.min.js` wird beim Build-Prozess (`npm run build:all`) automatisch von `node_modules/lucide/dist/umd/` nach `/out` kopiert.
2. **HTML:** Die Einbindung erfolgt statisch in `src/index.ts` über ein `<script src="lucide.min.js">` Tag.
3. **Initialisierung:** Am Ende des HTML-Dokuments wird `lucide.createIcons()` beim `DOMContentLoaded` Event aufgerufen.

... [rest of Lucide section] ...

## ForceAtlas Layout-Engine

Für komplexe, organische Netzwerk-Darstellungen nutzt das System den **ForceAtlas2** Algorithmus.

### Dynamische Parameter-Skalierung
Um eine optimale räumliche Verteilung bei unterschiedlichen Graphen-Größen zu gewährleisten, passt die API (`/api/layout/force-atlas`) die Parameter `gravity` und `scalingRatio` dynamisch an:
- **Kleine Graphen (<25 Knoten):** Nutzen die Standardwerte der `RENDER_CONFIG`.
- **Mittlere Graphen (25-75 Knoten):** Reduzieren die Schwerkraft und erhöhen die Abstoßung schrittweise (bis zu 12-fache Skalierung).
- **Große Graphen (>75 Knoten):** Maximale Ausdehnung (24-fache Skalierung) bei minimaler Zentrums-Schwerkraft.
- **Kein künstliches Scaling:** Die `LayoutEngine` verwendet die nativen Koordinaten des Algorithmus ohne zusätzliche Kompression, um den natürlichen Raumfluss zu erhalten.

### Technische Einbindung
1.  **Berechnung:** Erfolgt in `src/app/api/layout/force-atlas/route.ts`.
2.  **Simulation:** Der Algorithmus läuft synchron für eine definierte Anzahl an Iterationen (Standard: 100).
3.  **Form-Konstanz:** Im ForceAtlas-Modus werden alle Knoten unabhängig von ihrem Typ als **Kreise (50x50)** dargestellt, um die visuelle Klarheit im Netzwerk zu maximieren. Die semantische Unterscheidung erfolgt weiterhin über die Hintergrundfarbe.

### Nutzung im TSX (Modern)
Icons und Komponenten werden als native React-Komponenten (`lucide-react`) eingebunden. Dynamische Änderungen lösen über den `StateManager` automatisch Re-Renders aus.

### Design-Standards & CSS
Um ein einheitliches Erscheinungsbild zu gewährleisten, gelten folgende Standards (definiert in `src/app.css`):
- **Overlays:** Nutzen `position: fixed` und einen Z-Index von 9000+.
- **Buttons:** Nutzen `gap: 8px` und einheitliche `lucide-react` Icons.
- **Toolboxen:** Erscheinen kontextsensitiv oberhalb des selektierten Elements.

---
[End of environment.md]
