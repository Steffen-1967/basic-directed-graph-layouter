# Layout-Architektur & Zustandsverwaltung

## Zentrale Layout-Engine (`src/layoutEngine.ts`)
Die gesamte Layout-Logik ist in der Klasse `LayoutEngine` konsolidiert. Sie ist verantwortlich für die strukturelle Analyse, die Koordinaten-Zuweisung für verschiedene Layout-Typen sowie die Validierung und Transformation der Datenstrukturen.

### Konsolidierung (Refactoring 2026-04-15)
- Die Datei `layouterCalculate.ts` wurde entfernt. Alle Algorithmen (Flow, CompactFlow, Tree, Box, TaskList) wurden als Methoden in die `LayoutEngine` integriert.
- **Vorteil:** Einheitliche Fehlerbehandlung, reduzierter Code-Duplizierung und verbesserte Testbarkeit.

### Layout-Algorithmus (Sugiyama-Prinzip)
Die Engine verwendet einen ebenenbasierten Ansatz, um Knoten automatisch auf einer 2D-Fläche (Canvas) zu positionieren.

#### Eigenschaften
- **Robustes BFS-Layout:** Breitensuche zur stabilen Berechnung von Ebenen (Levels), auch bei Rückschleifen.
- **Hierarchische Pfadführung:** Erster Nachfolger bleibt auf Y-Höhe des Vorgängers.
- **Kollisionsvermeidung:** Automatische Y-Verschiebung bei Überlagerungen in derselben Ebene.
- **Layout-Sperre (Protection):** Ein Zeit- und Key-basierter Lock verhindert redundante Neuberechnungen innerhalb von 500ms für identische Konfigurationen.

## Zustandsverwaltung (`src/stateManager.ts`)
Zur Stabilisierung der Anwendung wurde ein zentraler `StateManager` eingeführt.

### Konzept
- **Single Source of Truth:** Alle Zustände (Envelope, Nodes, View, Interaction) werden zentral verwaltet.
- **Controlled Updates:** Änderungen am Zustand erfolgen über definierte Methoden, die Konsistenzprüfungen durchführen können.
- **Event-Bus:** Der `StateManager` nutzt den `StateEventBus` (`src/state.ts`), um Komponenten und Services über Änderungen (z.B. `NODE_SELECTED`, `VIEW_CHANGED`) zu informieren.
- **Entkopplung:** Services kommunizieren nicht mehr direkt miteinander über gegenseitige Referenzen, sondern reagieren auf Zustandsänderungen.

## Kanten-Routing (Unified Routing)
Das intelligente Routing-System für Verbindungspfeile zwischen Knoten.

### Eigenschaften
- **Richtung:** Einlauf immer links, Auslauf immer rechts.
- **Positionierung:** Vertikale Segmente verlaufen exakt in der Mitte zwischen zwei Knoten-Levels.
- **Rückschleifen (Loops):** Weichen in einem Bogen aus (nach oben, wenn der Quellknoten in der obersten Pfadzeile liegt, sonst nach unten). Bogenhöhe beträgt 80% der Zeilenhöhe.
- **Edge Routing an Rules:** Bündiger Anschluss an die diagonalen Ränder der Raute (mathematisch korrigiert).

## Editierbarer Modus & Handles

### Toggle-Button
- **Symbol:** ✏️ (Bleistift-Metapher)
- **Zustände:** "no" (grau-blau) / "yes" (grau-gelb)
- **Canvas-Verhalten:**
  - **Editable OFF:** Canvas-Größe wird aus Bounding Box + Margins berechnet
  - **Editable ON:** Canvas nutzt verfügbaren Container-Platz (minus 10px Margin)

### Bounding Box & Handles
- **Bounding Box:** Umschließt nur die geometrische Form (ohne Text)
- **Corner-Handles:** L-förmige Linien an allen 4 Ecken (Schenkellänge: 10px, Offset: 2px)
- **Anchor-Handles:** 12 Kreise (Durchmesser: 10px, Offset: 2px) - je 3 pro Kante (oben, unten, links, rechts)
- **Styling:**
  - Strichfarbe: `#2c3e50` (dunkelgrau)
  - Strichstärke: 2px
  - Füllfarbe Anchors: `#6c757d` (grau-blau)

### Hover-Verhalten
- **Editable OFF:** 
  - Tooltip mit Node-Informationen (ID, Type, Name, Description)
  - Tooltip-Breite: max. 260px (2× taskWidth)
  - Name: einzeilig mit Ellipsis bei Überlauf
  - Description: 3 Zeilen mit Ellipsis bei Überlauf
  - Cursor wechselt zu Standard-Pfeil beim Hover über Knoten
  - Hover-Erkennung für alle Typen: Event, Task, SubProcess, Rule
- **Editable ON:** 
  - Handles werden angezeigt, Tooltip ist ausgeblendet
  - Cursor wechselt zu Standard-Pfeil beim Hover über Knoten
  - Erweiterte Hover-Fläche: 10px (voller Anchor-Handle-Durchmesser) über Knotengrenzen hinaus
  - Rule-Typ: Hover-Bereich als quadratische Raute (Manhattan-Distanz)
  - Anchor-Handles: Hellblaue Füllung (#ADD8E6) beim Hover, sonst blau-violett (#8c97ff)

### Anchor-Handle-Positionierung
Die 12 Anchor-Handles werden über die Funktion `calculateAnchorHandles()` berechnet und als Objekt mit Keys wie "top-1", "left-2", "bottom-3" zurückgegeben.

#### Task-Typ & SubProcess-Typ (Rechteck)
- Handles werden gleichmäßig an den Kanten der Bounding Box verteilt
- Offset: 2px von der Kante
- Positionen: 1/4, 2/4 (Mitte), 3/4 auf jeder Seite
- SubProcess hat zusätzlich doppelte Randstärke (4px) und Plus-Symbol im unteren Rechteck

#### Event-Typ (Kreis)
- Handles an Position 2/4 (Mitte): wie Task-Typ
- Handles an Position 1/4 und 3/4:
  - Offset: 3px (1,5× Standard-Offset)
  - Werden mathematisch auf den Kreisrand verschoben (Pythagoras)
  - Zusätzliche horizontale/vertikale Verschiebung um 1px (0,5× Offset)

#### Rule-Typ (Raute)
- Handles an Position 2/4 (Mitte): wie Task-Typ
- Handles an Position 1/4 und 3/4:
  - Offset: 3px (1,5× Standard-Offset)
  - Werden auf die Rautenkanten verschoben (Manhattan-Distanz)
  - Zusätzliche horizontale/vertikale Verschiebung um 1px (0,5× Offset)

### Cursor-Verhalten
- **Standard (Panning):** `move` (4-Richtungs-Pfeil)
- **Beim Hover über Knoten:** `default` (Standard-Pfeil)
- **Beim Dragging:** `move` (bleibt unverändert)

---

## Detaillierte Vorghensweise des Layouters (Version 1.0.0)

---

### 1. Vorbereitung der Datenstruktur (Preprocessing)
* **1.1 Knoten-Mapping:** Erstellung einer `nodeMap`, um über die ID direkten Zugriff auf die `GraphNode`-Objekte zu erhalten.
* **1.2 Adjazenzlisten-Transformation (Speziell für Flow-Layout):**
    * In der Funktion **`evolveOutgoingPredecessorsForFlow`** werden die ursprünglichen `incoming` Relationen vom Typ `predecessor` invertiert.
    * Eine temporäre `outgoing`-Liste wird für jeden Knoten berechnet, um das schnelle reverse Lookup für die Breitensuche (BFS) zu ermöglichen.
    * **Wichtig:** Diese doppelte Datenhaltung findet exklusiv für das Flow-Layout statt. Alle anderen Layouts (Tree, Box, ForceAtlas) arbeiten direkt auf den ursprünglichen Relationen.
* **1.3 Tracking & State:**
    * Ein `Set` namens `visited` verhindert die mehrfache Platzierung von Knoten.
    * Eine `levelOccupancy`-Map speichert pro Ebene (X), welche vertikalen Slots (Y) bereits belegt sind.

### 2. Kern-Algorithmus (BFS-basiertes Layout)
Das Layout wird in "Komponenten" (zusammenhängende Teilgraphen) berechnet.

* **2.1 Identifikation der Wurzelknoten:**
    * Der Algorithmus sucht zuerst nach Knoten ohne Vorgänger (`predecessors.length === 0`).
    * Diese bilden die Startpunkte der Breitensuche (BFS).
* **2.2 Ebenen-Berechnung (Horizontale Achse):**
    * Die X-Koordinate ergibt sich aus dem `level` (Distanz zum Startknoten).
* **2.3 Positionierung & Kollisionsvermeidung (Vertikale Achse):**
    * **2.3.1 Initiales Target:** Ein Nachfolger wird primär auf der Y-Höhe seines Vorgängers eingeplant.
    * **2.3.2 Auffächerung:** Haben Knoten mehrere Kinder (Einträge in `successors`), werden diese mit einem Versatz untereinander gestapelt.
    * **2.3.3 Dynamische Verschiebung:** Falls ein Slot belegt ist, wird der Knoten rekursiv nach unten verschoben.
* **2.4 Pfad-Optimierungs-Flags:**
    * Der erste Pfad eines Startknotens wird als `isTopRow = true` markiert. Dies dient später der visuellen Steuerung von Rückkopplungspfeilen.

### 3. Behandlung von Sonderfällen
* **3.1 Isolierte Teilgraphen:** Nach der Bearbeitung der Hauptpfade prüft der Code erneut auf unbesuchte Knoten, um auch Fragmente oder geschlossene Ringe zu erfassen.
* **3.2 Vertikaler Komponenten-Abstand:** Um Überlappungen verschiedener Prozessbäume zu vermeiden, wird nach jeder abgeschlossenen Komponente ein Puffer von `200px` (2 * ROW_HEIGHT) zum `currentY`-Zähler addiert.

### 4. Visuelle Rendering-Logik (Canvas)
* **4.1 Koordinaten-Zentrierung:** `centerGraph` berechnet die Bounding Box des gesamten Layouts und verschiebt den `offsetX/Y`, um den Graphen mittig im Container zu platzieren.
* **4.2 Intelligente Pfeilführung (Manhattan-Routing):**
    * **Vorwärtsgerichtet:** Pfeile werden rechtwinklig über einen Mittelpunkt (`midX`) zwischen den Ebenen geführt.
    * **Rückwärtsgerichtet (Loops):** Wenn ein Zielknoten links vom Startknoten liegt, wird der Pfeil in einem weiten Bogen (Detour) oberhalb oder unterhalb der Knoten geführt, um Text-Überlagerungen zu minimieren.

## ForceAtlas2 (Server-Side)
Für komplexe, nicht-hierarchische Graphen wird der ForceAtlas2-Algorithmus serverseitig via `graphology` berechnet.

### Strukturierte Initialisierung (Warm-up)
Um eine stabile und reproduzierbare Ausrichtung zu gewährleisten, werden die Knoten vor dem Start des Algorithmus in drei Zonen vorpositioniert:
1.  **Standard-Zone (Linie):** Knoten vom Typ `Event`, `Rule` und `Task` werden auf einer horizontalen Linie im oberen Bereich (`y = -3 * size`) verteilt.
2.  **Prozess-Zone (Linie):** `SubProcess`-Knoten werden zentriert auf der Nulllinie (`y = 0`) angeordnet.
3.  **Support-Zone (Kreis):** Alle anderen Knotentypen werden kreisförmig im unteren Bereich (`y = +5 * size`) positioniert.

### Algorithmische Parameter
- **Gravity:** Adaptiv (16.0 bis 6.4), sinkt mit steigender Knotenanzahl zur Vermeidung von Klumpenbildung.
- **Scaling Ratio:** Adaptiv (2000 bis 3800), steigt mit der Knotenanzahl für mehr Leerraum.
- **Strong Gravity Mode:** Aktiviert für kompaktere Komponenten.
- **LinLog Mode:** Aktiviert für bessere Cluster-Trennung.
- **Outbound Attraction:** Aktiviert, um Hubs ins Zentrum zu rücken.
