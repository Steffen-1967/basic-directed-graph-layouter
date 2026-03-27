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
- `savePointer`: Index des Stacks beim letzten persistenten Speichern.
- `maxSteps`: 50 (Konfigurierbar).
- `persistenceKey`: Eindeutiger Schlüssel für LocalStorage (szenario-spezifisch).

### Action-Interface
Jede Action muss folgende Methoden implementieren:
- `execute()`: Führt die Änderung am `nodes`-Array durch.
- `undo()`: Macht die Änderung exakt rückgängig.
- `focus()`: (Optional) Gibt die Node-ID zurück, die fokussiert werden soll.

## 3. Strategische Meilensteine (Phasen)

### Phase 1: Die Infrastruktur & Persistenz ✅ ABGESCHLOSSEN
... [Bestehender Inhalt bleibt] ...

### Phase 2: Basis-Actions ✅ ABGESCHLOSSEN
... [Bestehender Inhalt bleibt] ...

### Phase 3: Komplexe Operationen (Composite Actions) ✅ ABGESCHLOSSEN
- ✅ Einführung von `CompositeAction` für atomare Gruppen von Änderungen.
- ✅ Implementierung:
  - `CompositeAction` hält eine Liste von Sub-Actions.
  - `execute()`: Führt Sub-Actions sequenziell aus.
  - `undo()`: Macht Sub-Actions in **reverser** Reihenfolge rückgängig.
- **Anwendungsfall:** "Farbe setzen" (Update von `overrideFillColor` und `overrideStrokeColor` in einem Schritt).

### Phase 4: Mouse-Interaktion (Coalescing) 🔄 GEPLANT
... [Bestehender Inhalt bleibt] ...

### Phase 5: Erweiterte Actions ✅ ABGESCHLOSSEN
- ✅ **DeleteNodeAction:** Vollständige Knoten-Wiederherstellung inkl. ID und Position.
- ✅ **AddNodeAction:** Hinzufügen neuer Knoten an spezifischen Positionen.

### Phase 8: UI-Interaktion & Toolbox ✅ ABGESCHLOSSEN (2026-03-23)
- ✅ **Toolbox-System:** Kontextmenü für Knoten via Anchor-Handles.
- ✅ **Color-Picker:** Visuelle Farbauswahl für Knoten.
- ✅ **Composite Actions im Einsatz:** Farbanpassungen nutzen atomare Gruppen-Updates.
- ✅ **JSDoc Dokumentation:** Alle Actions vollständig dokumentiert in `src/actions.js`.

... [Rest der Phasen und Details bleiben erhalten] ...

## 6. Action-Bibliothek (Referenz)

### UpdatePropertyAction ✅
```javascript
/**
 * Aktualisiert eine einzelne Eigenschaft eines Knotens.
 */
class UpdatePropertyAction {
    constructor(nodes, nodeId, property, newValue, oldValue) { ... }
    execute() { ... }
    undo() { ... }
}
```

### CompositeAction ✅
```javascript
/**
 * Gruppiert mehrere Aktionen zu einer atomaren Einheit.
 */
class CompositeAction {
    constructor(actions) { this.actions = actions; }
    execute() { this.actions.forEach(a => a.execute()); }
    undo() { 
        for (let i = this.actions.length - 1; i >= 0; i--) {
            this.actions[i].undo();
        }
    }
}
```

... [Rest der Datei bleibt unverändert] ...
