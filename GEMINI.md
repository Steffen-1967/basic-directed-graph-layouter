# Project: mylife-app

> [!IMPORTANT]
> **NÄCHSTER SCHRITT / TODO:** Finalisierung der PostgreSQL AGE Integration für die Speicherung von Szenarien (nach der Migration von JSON-Dateien).

## Aktueller Status (2026-04-13 - Phase 2)
- ✅ **Strukturelle Konsolidierung:** 
    - Renaming von `state.scenario` zu `state.envelope` (Single-Root Container).
    - Renaming von `CONFIG` zu `RENDER_CONFIG` (Trennung von Layout-Logik und Render-Konfiguration).
    - Konsolidierung der Persistenz-Säuberung in `cleanupEnvelopeForPersistence` (LayoutEngine).
- ✅ **Layout & Bridging Robustheit:** 
    - Der Bridging-Algorithmus in `LayoutEngine` nutzt nun bidirektionales BFS, um Verbindungen auch dann zu finden, wenn sie in den Rohdaten nur in einer Richtung (incoming/outgoing) definiert sind.
    - Die Layout-Typ-Prüfungen in `manifest.ts` (`collectAllNodes`, `isLayoutEditable`, etc.) wurden case-insensitiv gestaltet, um Fehler bei manuell bearbeiteten JSON-Daten zu vermeiden.
    - Unterstützung für `output` als struktureller Kanten-Typ für korrekte Pfadfindung in `CompactFlow`.
    - Fix für `switchToListLevel` im Tree-Layout (wird nun korrekt aus den `layoutPreferences` des Envelopes bezogen).
- ✅ **UX & Session Management:** 
    - Persistente `clientId` in `localStorage` verhindert Selbst-Aussperrung nach einem Seiten-Refresh im Edit-Modus.
    - Neuer "Save before leave" Modal-Dialog beim Laden eines neuen Datensatzes, falls ungespeicherte Änderungen vorliegen (Save / Discard / Cancel Flow).
    - Automatischer Reset der Node/Edge-Selektion beim Laden neuer Datensätze (keine veralteten Markierungen mehr).
    - Die Canvas-Instruktion "Drag to move the complete graphic" ist nun kontextsensitiv und nur in Flow-basierten Layouts sichtbar.
    - TaskList-Symbole respektieren nun die `overrideFillColor` von Knoten (Konsistenz mit Flow-Layout).
- ✅ **Architektur-Stabilisierung (2026-04-15):**
    - Konsolidierung der Layout-Logik: `layouterCalculate.ts` wurde entfernt, alle Algorithmen sind nun in `LayoutEngine.ts` (OOP-Struktur).
    - Einführung des `StateManager`: Zentrale Steuerung von Zustandsänderungen und Event-Emmitting zur Reduzierung von Seiteneffekten.
    - Robuste Layout-Sperren: Implementierung eines Zeit- und Key-basierten Locks in `applyLayout`, um redundante Berechnungen (z.B. bei schnellen Klicks oder Initialisierungs-Loops) zu verhindern.
    - Fix für "Compact Flow": Korrektur der Kanten-Highlighting und Hover-Logik durch konsequente Nutzung des aktiven Layout-Typs.
    - CSS-Fixes: `edgePropertyOverlay` wird nun korrekt als absolut positioniertes Overlay über dem Canvas angezeigt.
