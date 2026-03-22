# Technisches Design: Undo-Redo System (mylife-app)

Dieses Dokument dient als verbindliche Spezifikation für die Implementierung der Undo-Redo-Funktionalität.

## 1. Architektur-Übersicht

Das System basiert auf dem **Command-Pattern** und wird in drei Module unterteilt, um Wartbarkeit und KI-Verständnis zu maximieren:

1.  **`src/historyManager.js`**: Generischer Stack-Manager inkl. LocalStorage-Persistierung.
2.  **`src/actions.js`**: Bibliothek der konkreten Action-Klassen (z.B. `UpdatePropertyAction`, `MoveAction`, `DeleteNodeAction`, `CompositeAction`).
3.  **`src/index.ts`**: Orchestrierung und UI-Anbindung.

## 2. Datenstrukturen

### HistoryManager (Zustand im Browser)
- `undoStack`: Array von Action-Objekten.
- `redoStack`: Array von Action-Objekten.
- `savePointer`: Index des Stacks beim letzten persistenten Speichern (zeigt auf den Eintrag, der nach System-Neustart wiederhergestellt wird).
- `maxSteps`: 50 (Konfigurierbar).
- `persistenceKey`: Eindeutiger Schlüssel für LocalStorage (szenario-spezifisch).

### Action-Interface
Jede Action muss folgende Methoden implementieren:
- `execute()`: Führt die Änderung am `nodes`-Array durch.
- `undo()`: Macht die Änderung exakt rückgängig.
- `focus()`: (Optional) Gibt die Node-ID zurück, die fokussiert werden soll (UI-Entscheidung bleibt in `index.ts`).

## 3. Strategische Meilensteine (Phasen)

### Phase 1: Die Infrastruktur & Persistenz ✅ ABGESCHLOSSEN
- ✅ Erstellung von `src/historyManager.js` und Integration in den Build-Prozess (`index.ts`).
- ✅ Implementierung der `clear()`, `execute()`, `undo()` und `redo()` Methoden.
- ✅ Automatische Snapshot-Sicherung im `localStorage` nach jeder Aktion.
- ✅ Recovery-Logik beim Initialisieren (Wiederherstellung ungespeicherter Zustände).
- ✅ Ableitung des `dirty`-Flags aus dem Vorhandensein eines Snapshots im LocalStorage.
- ✅ `beforeunload`-Warning bei ungespeicherten Änderungen.

### Phase 2: Basis-Actions ✅ ABGESCHLOSSEN
- ✅ Implementierung der `UpdatePropertyAction` (z.B. für "name").
- ✅ Umstellung des bestehenden In-Place-Editings auf das History-System.
- ✅ Keyboard-Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z).
- ✅ UI-Buttons für Undo/Redo mit Enabled/Disabled-State.

### Phase 3: Komplexe Operationen (Composite Actions) ✅ ABGESCHLOSSEN
- ✅ Einführung von `CompositeAction` für atomare Gruppen von Änderungen.
- ✅ Implementierung:
  - `CompositeAction` hält eine Liste von Sub-Actions (atomare Commands).
  - `execute()`: Durchläuft die Liste vorwärts und führt jede Action aus.
  - `undo()`: Durchläuft die Liste **rückwärts** und macht jede Action rückgängig.
  - Sub-Actions können auch einzeln in der Undo-Chain stehen.
  - `focus()`: Gibt die Node-ID der ersten Sub-Action zurück (falls vorhanden).
- **Anwendungsfall:** "Shape einfügen" (Löschen alter Kanten + Einfügen Node + Neue Kanten als eine atomare Operation).

### Phase 4: Mouse-Interaktion (Coalescing) 🔄 GEPLANT
- **Ziel:** Implementierung der `MoveAction` für Drag & Drop von Knoten.
- **Coalescing-Strategie:**
  - Beim `mousedown`: Startposition erfassen, aber **keine** Action committen.
  - Während `mousemove`: Position temporär aktualisieren (ohne History-Eintrag).
  - Beim `mouseup`: **Eine einzige** `MoveAction` mit Differenz (Start → End) committen.
- **Vorteil:** Vermeidung von hunderten Einzelpixel-Schritten im Stack.

### Phase 5: Erweiterte Actions ✅ ABGESCHLOSSEN
- ✅ **DeleteNodeAction:**
  - Speichert den kompletten Node als **Deep Copy** (inkl. ID).
  - Speichert `predecessorId` und `successorId` für präzise Positions-Wiederherstellung.
  - `undo()`: Fügt den Node mit **Original-ID** an der ursprünglichen Position wieder ein.
  - Fallback-Logik: Primär nach Vorgänger, sekundär vor Nachfolger, tertiär ans Ende.
- ✅ **AddNodeAction:**
  - Fügt einen neuen Node hinzu (optional nach spezifischem Vorgänger).
  - Speichert Position beim `execute()` für korrektes Redo.
  - `undo()`: Entfernt den Node wieder.
- **UpdateConnectionAction:** 🔄 GEPLANT
  - Ändert `predecessorIds` / `successorIds`.
  - Speichert alte und neue Werte für Undo.

### Phase 6: UI-Synchronisation & Polish 🔄 GEPLANT
- Automatisches `renderAll()` nach jedem Undo/Redo (bereits implementiert).
- Visuelle Indikatoren (Buttons grau/aktiv) (bereits implementiert).
- Optional: Automatisches Fokussieren der betroffenen Node nach Undo/Redo (UI-Entscheidung).

## 4. Checkliste der Best-Practices (Mandat)

1.  **Coalescing:** Keine hunderte Einzelpixel-Schritte im Stack; Aktionen beim Drag erst beim `mouseup` committen.
2.  **Selection State:** Der `hoveredNode`-State muss **nicht** durch Undo/Redo wiederhergestellt werden (UI-Entscheidung bleibt in `index.ts`).
3.  **Deep Copies:** Beim Löschen/Ändern werden tiefe Kopien der Daten in der Action gespeichert (`JSON.parse(JSON.stringify(...))`).
4.  **Redo-Invalidierung:** Neue Aktionen löschen sofort den gesamten Redo-Stack (bereits implementiert).
5.  **ID-Persistenz:** Beim Wiederherstellen gelöschter Nodes MUSS die ursprüngliche ID verwendet werden (Referenzsicherheit für `predecessorIds`/`successorIds`).
6.  **Atomare Operationen:** Komplexe Änderungen (z.B. "Node einfügen + Kanten umhängen") werden als `CompositeAction` gruppiert.

## 5. Lifecycle-Regeln

### Laden eines neuen Szenarios
- Der `HistoryManager` wird komplett resettet (`clear()`).
- Der `persistenceKey` wird auf das neue Szenario gesetzt (`'mylife_snapshot_' + fileName`).
- Falls ein Snapshot für das neue Szenario existiert, wird der User gefragt, ob er ihn wiederherstellen möchte.
- **Status:** ✅ Bereits implementiert in `loadData()`.

### Speichern (Zukünftiges Feature)
- Beim erfolgreichen Speichern wird `savePointer` auf den aktuellen `undoStack.length` gesetzt.
- Der LocalStorage-Snapshot wird gelöscht (da der Zustand nun persistent gespeichert ist).
- **Vorbereitung:** Methode `markAsSaved()` im `HistoryManager`:
  ```javascript
  markAsSaved() {
      this.savePointer = this.undoStack.length;
      localStorage.removeItem(this.persistenceKey);
  }
  ```

### Dirty-Flag-Logik
- `isDirty()` gibt `true` zurück, wenn:
  - Der `undoStack` nicht leer ist **ODER**
  - Ein Snapshot im LocalStorage existiert.
- **Status:** ✅ Bereits implementiert.

## 6. Action-Bibliothek (Referenz)

### UpdatePropertyAction ✅
```javascript
class UpdatePropertyAction {
    constructor(nodes, nodeId, property, newValue, oldValue) { ... }
    execute() { node[property] = newValue; }
    undo() { node[property] = oldValue; }
    focus() { return nodeId; }
}
```

### CompositeAction ✅
```javascript
class CompositeAction {
    constructor(actions) { this.actions = actions; }
    execute() { this.actions.forEach(a => a.execute()); }
    undo() { 
        for (let i = this.actions.length - 1; i >= 0; i--) {
            this.actions[i].undo();
        }
    }
    focus() { 
        if (this.actions.length > 0 && typeof this.actions[0].focus === 'function') {
            return this.actions[0].focus();
        }
        return null;
    }
}
```

### MoveAction 🔄
```javascript
class MoveAction {
    constructor(nodes, nodeId, oldX, oldY, newX, newY) { ... }
    execute() { node.x = newX; node.y = newY; }
    undo() { node.x = oldX; node.y = oldY; }
    focus() { return nodeId; }
}
```

### DeleteNodeAction ✅
```javascript
class DeleteNodeAction {
    constructor(nodes, nodeId) {
        this.nodes = nodes;
        this.nodeId = nodeId;
        const index = nodes.findIndex(n => n.id === nodeId);
        
        if (index !== -1) {
            const node = nodes[index];
            this.deletedNode = JSON.parse(JSON.stringify(node)); // Deep Copy
            
            // Store position for restoration
            this.predecessorId = (index > 0) ? nodes[index - 1].id : null;
            this.successorId = (index < nodes.length - 1) ? nodes[index + 1].id : null;
        } else {
            // Node not found - make action a no-op
            this.deletedNode = null;
            this.predecessorId = null;
            this.successorId = null;
            console.warn(`DeleteNodeAction: Node with ID ${nodeId} not found`);
        }
    }
    execute() {
        if (!this.deletedNode) return; // No-op if node wasn't found
        const index = this.nodes.findIndex(n => n.id === this.nodeId);
        if (index !== -1) this.nodes.splice(index, 1);
    }
    undo() {
        if (!this.deletedNode) return; // No-op if node wasn't found
        // Try predecessor → successor → fallback
        if (this.predecessorId) {
            const predIndex = this.nodes.findIndex(n => n.id === this.predecessorId);
            if (predIndex !== -1) {
                this.nodes.splice(predIndex + 1, 0, this.deletedNode);
                return;
            }
        }
        if (this.successorId) {
            const succIndex = this.nodes.findIndex(n => n.id === this.successorId);
            if (succIndex !== -1) {
                this.nodes.splice(succIndex, 0, this.deletedNode);
                return;
            }
        }
        this.nodes.push(this.deletedNode);
    }
    focus() { return this.nodeId; }
}
```

### AddNodeAction ✅
```javascript
class AddNodeAction {
    constructor(nodes, newNode, insertAfterId = null) {
        this.nodes = nodes;
        this.newNode = JSON.parse(JSON.stringify(newNode)); // Deep Copy
        this.insertAfterId = insertAfterId;
        this.predecessorId = null;
        this.successorId = null;
    }
    execute() {
        let insertIndex = this.nodes.length;
        if (this.insertAfterId) {
            const predIndex = this.nodes.findIndex(n => n.id === this.insertAfterId);
            if (predIndex !== -1) insertIndex = predIndex + 1;
        }
        this.predecessorId = (insertIndex > 0) ? this.nodes[insertIndex - 1].id : null;
        this.successorId = (insertIndex < this.nodes.length) ? this.nodes[insertIndex].id : null;
        this.nodes.splice(insertIndex, 0, this.newNode);
    }
    undo() {
        const index = this.nodes.findIndex(n => n.id === this.newNode.id);
        if (index !== -1) this.nodes.splice(index, 1);
    }
    focus() { return this.newNode.id; }
}
```

## 7. Race-Conditions & Fehlerbehandlung

### Bereits implementierte Schutzmaßnahmen ✅
1. **Idempotente Actions:** No-Op-Verhalten bei Fehlern (z.B. Node nicht gefunden)
2. **ID-basierte Referenzen:** Keine Objekt-Pointer, nur IDs
3. **Deep Copies:** Isolation von Original-Daten
4. **Defensive UI-Checks:** `hoveredNode` und `editingNode` werden validiert
5. **Action-Validierung:** Warnungen bei inkonsistenten Zuständen

### Bekannte Risiken & Gegenmaßnahmen ⚠️

#### 1. Asynchrone Operationen (zukünftig)
**Risiko:** Wenn zukünftig asynchrone Operationen (z.B. Server-Requests) implementiert werden, können Race-Conditions zwischen Action-Konstruktor und `execute()` auftreten.

**Gegenmaßnahmen:**
- ✅ Actions sind bereits idempotent (mehrfache Ausführung ist sicher)
- ⚠️ **TODO:** Bei Async-Implementierung: Prüfen, ob `nodes`-Array zwischen Konstruktor und `execute()` verändert wurde
- ⚠️ **TODO:** Erwägen von Optimistic Locking (Version-Counter im `nodes`-Array)

**Beispiel-Problem:**
```javascript
// GEFAHR: Async-Operation zwischen Konstruktor und execute()
async function deleteNodeAsync(nodeId) {
    const action = new DeleteNodeAction(nodes, nodeId); // ← Snapshot hier
    await someServerRequest(); // ← nodes könnte sich ändern
    history.execute(action, nodes); // ← execute() arbeitet auf verändertem Array
}
```

**Empfohlene Lösung:**
```javascript
// SICHER: Action erst nach Async-Operation erstellen
async function deleteNodeAsync(nodeId) {
    await someServerRequest();
    const action = new DeleteNodeAction(nodes, nodeId); // ← Snapshot nach Async
    history.execute(action, nodes);
}
```

#### 2. Multi-Tab-Szenarien (aktuell)
**Risiko:** Mehrere Browser-Tabs arbeiten auf unterschiedlichen `nodes`-Arrays, teilen sich aber LocalStorage.

**Aktueller Status:**
- ✅ Tab-ID wird in Snapshots gespeichert
- ✅ Warnung bei Snapshot von anderem Tab
- ✅ **WebSocket-basiertes Locking implementiert** (Phase 7)

**Implementierte Lösung:**
- WebSocket-Server verwaltet Locks zentral (In-Memory, nicht persistiert)
- Nur ein Tab kann gleichzeitig editieren (Lock-Holder)
- Weitere Tabs werden automatisch in Read-Only-Modus versetzt
- Modal-Dialog informiert User über Lock-Status
- Tooltip am Padlock-Icon zeigt Lock-Holder-ID

**Lock-Verlust-Strategie bei Verbindungsabbruch:**
1. **Server gibt Lock automatisch frei** bei WebSocket-Disconnect
2. **LocalStorage bleibt erhalten** - Undo/Redo-Chain und Snapshot bleiben im Browser
3. **Recovery funktioniert weiterhin** - User kann später seine Änderungen wiederherstellen
4. **Andere Tabs können Lock übernehmen** - Kein "Zombie-Lock"-Problem
5. **Ursprünglicher Tab** sieht Read-Only-Modus beim Reconnect

**Vorteile:**
- ✅ Keine Datenverluste (LocalStorage-Persistierung unabhängig vom Lock)
- ✅ Keine blockierten Tabs (automatische Lock-Freigabe)
- ✅ Klare UI-Kommunikation (Modal + Tooltip)

**Bekannte Risiken & Einschränkungen:**

1. **Lock-Release-Benachrichtigung:**
   - ✅ **Implementiert:** WebSocket-Broadcast bei `lock_released` → Alle Tabs werden benachrichtigt
   - ✅ **Verhalten:** Padlock-Icon und Edit-Button werden automatisch aktualisiert
   - ✅ **Console-Log:** Tab A sieht "[Lock] Scenario is now available for editing"

2. **Konflikt-Szenario (Race Condition):**
   ```
   Zeitpunkt 1: Tab A hat Lock + macht Änderungen
   Zeitpunkt 2: Tab A verliert Verbindung → Server gibt Lock frei
   Zeitpunkt 3: Tab B übernimmt Lock + macht andere Änderungen + speichert
   Zeitpunkt 4: Tab A kommt zurück + stellt seine Änderungen wieder her
   Zeitpunkt 5: Tab A speichert → ÜBERSCHREIBT Tab B's Änderungen!
   ```
   
   **Aktueller Status:**
   - ⚠️ **Keine Konflikt-Erkennung** beim Recovery
   - ⚠️ **Keine Versionierung** der Szenarien
   - ⚠️ **Kein Timestamp-Vergleich** zwischen LocalStorage und Server
   
   **Mögliche Lösungen (noch nicht implementiert):**
   - **Option A (Pessimistisch):** LocalStorage-Snapshot wird gelöscht, wenn Lock verloren geht
   - **Option B (Optimistisch):** Timestamp-Vergleich + Warnung beim Recovery
   - **Option C (Versionierung):** Server prüft Version-Nummer beim Speichern
   
   **Empfehlung für lokale Entwicklung:**
   - Nur ein Tab gleichzeitig verwenden
   - Bei Lock-Verlust: Seite neu laden (verwirft LocalStorage)
   - Regelmäßig speichern (zukünftiges Feature)

3. **Recovery-Dialog-Verhalten:**
   - ✅ **Implementiert:** Erweiterter Dialog mit Timestamps
   - ✅ **Anzeige:** Zeigt Datum/Uhrzeit der lokalen Änderungen
   - ✅ **Konflikt-Warnung:** Warnt explizit, wenn Server-Datei neuer ist
   - ✅ **Vergleich:** Server-Timestamp vs. LocalStorage-Timestamp
   
   **Beispiel-Dialog:**
   ```
   Ungespeicherte Änderungen für "test-01.json" gefunden.
   
   Ihre Änderungen vom: 22.03.2026, 14:35:12
   
   ⚠️ WARNUNG: Die Datei auf dem Server wurde zwischenzeitlich geändert!
   Server-Version vom: 22.03.2026, 15:20:45
   
   Wenn Sie Ihre Änderungen wiederherstellen, könnten Sie neuere Daten überschreiben.
   
   Möchten Sie Ihre Änderungen wiederherstellen?
   ```

### Fehler-Logging & Debugging

**Aktuell:**
- Warnungen werden mit `[WARN]`-Präfix in Browser-Console ausgegeben
- Fehler werden mit `console.error()` geloggt

**Geplant (Phase 7):**
- Zentrale `Logger`-Klasse in `src/logger.js`
- HTML-Debug-Panel für Live-Anzeige von Warnungen
- LocalStorage-basiertes Fehler-Log mit Download-Funktion
- Optional: Server-Endpoint für zentrales Logging

## 8. Offene Punkte & Entscheidungen

### Bereits geklärt ✅
- ✅ Coalescing-Strategie: Erst beim `mouseup` committen.
- ✅ CompositeAction: Undo in reverser Reihenfolge.
- ✅ ID-Persistenz: Deep Copy mit Original-ID.
- ✅ Selection State: Muss nicht wiederhergestellt werden.
- ✅ savePointer-Logik: Zeigt auf letzten persistenten Save.
- ✅ Lifecycle beim Laden: Bereits korrekt implementiert.
- ✅ Race-Condition-Schutz: Defensive Checks und Validierung implementiert.

### Zu klären 🔄
- **Multi-Tab-Locking:** BroadcastChannel API vs. Mini-Server (Phase 7)
- **Debug-Panel:** HTML-Element für Live-Warnungen (Phase 7)

## 9. Implementierungsreihenfolge (Nächste Schritte)

### ✅ Abgeschlossen (Phase 1-5)
1. ✅ **CompositeAction** - Implementiert
2. ✅ **DeleteNodeAction & AddNodeAction** - Implementiert mit Positions-Wiederherstellung
3. ✅ **Defensive Checks** - UI-Validierung für `hoveredNode` und `editingNode`
4. ✅ **Action-Validierung** - Warnungen bei inkonsistenten Zuständen

### ✅ Abgeschlossen (Phase 1-7)
1. ✅ **Infrastruktur & Persistenz** (Phase 1)
2. ✅ **Basis-Actions** (Phase 2)
3. ✅ **Composite Actions** (Phase 3)
4. ✅ **Erweiterte Actions** (Phase 5: DeleteNodeAction, AddNodeAction)
5. ✅ **Server-Infrastruktur** (Phase 7)
   - Mini-Server mit Express
   - WebSocket-basiertes Multi-Tab-Locking
   - Client-seitige Integration
   - Playwright End-to-End Tests
   - Recovery-Dialog mit Timestamp-Vergleich

### 📋 Als Nächstes (Phase 8: Undo-Redo Fortsetzung)
9. **MoveAction mit Coalescing implementieren** 🔄 GEPLANT
   - Temporärer Drag-State in `index.ts`
   - Commit beim `mouseup`
   - Integration mit `renderAll()`
   - **Ziel:** Drag & Drop von Knoten im Edit-Modus mit Undo/Redo-Support

10. **UpdateConnectionAction implementieren** 🔄 GEPLANT
    - Für Änderungen an `predecessorIds`/`successorIds`
    - Vorbereitung für Anchor-Handle-Drag

11. **markAsSaved() implementieren** 🔄 GEPLANT
    - Methode im `HistoryManager`
    - Integration in zukünftiges Save-Feature

12. **Optional: Focus-Handling nach Undo/Redo** 🔄 GEPLANT
    - Automatisches Setzen von `hoveredNode` nach `action.focus()`
    - UI-Feedback (z.B. kurzes Highlight)

### 📋 Zukünftige Verbesserungen (Phase 9+)
13. **Server-Logging-System** ✅ ABGESCHLOSSEN (2026-03-22)
    - **Tägliche Log-Rotation:** Neue Datei pro Tag (`app_YYYY-MM-DD.log`)
    - **JSON-Format:** Strukturierte Logs mit Timestamp, Level, Category, Message, Details
    - **Automatische Cleanup-Routine:** Löscht Logs älter als 7 Tage beim Server-Start
    - **Client-Endpoint:** `POST /api/log` für zentrales Logging vom Browser
    - **Logger-Klasse (Server):** `server/logger.js` mit `info()`, `warn()`, `error()` Methoden
    - **Logger-Klasse (Client):** `src/logger.js` mit Kategorie-basiertem Logging
    - **Log-Kategorien:** SERVER, WS, LOCK, API, HISTORY, ACTION, LAYOUT
    - **Log-Levels:** INFO, WARN, ERROR
    - **Integration:** Alle `console.*` Aufrufe durch Logger-Instanzen ersetzt
    - **Präfix-Standardisierung:** Konsistente Kategorien in allen Log-Meldungen
    - **Dokumentation:** Vollständig in `environment.md` dokumentiert
    - **Getestet:** Log-Datei wird korrekt erstellt und beschrieben

14. **UI-Modernisierung: Custom Modal-Dialoge** 🔄 GEPLANT
    - Ersetzung aller `alert()`-Aufrufe durch Custom-Modals
    - Konsistentes Design wie beim Lock-System (`#lockModal`)
    - Nicht-blockierende Dialoge mit besserer UX
    - **Betroffene Stellen:**
      - Fehler beim Laden von Szenarien
      - Netzwerkfehler
      - Recovery-Dialog (bereits teilweise implementiert)
    - **Vorteile:**
      - Modernes, einheitliches Design
      - Bessere Kontrolle über Styling und Verhalten
      - Keine Browser-nativen Dialoge mehr
