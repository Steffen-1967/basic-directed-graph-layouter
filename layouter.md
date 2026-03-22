# Layout-Algorithmus & Kanten-Routing

## Layout-Algorithmus
Der Algorithmus in der Funktion `calculateLayout` verwendet einen ebenenbasierten Ansatz (ähnlich dem Sugiyama-Prinzip), um Knoten eines gerichteten Graphen automatisch auf einer 2D-Fläche (Canvas) zu positionieren.

### Eigenschaften
- **Robustes BFS-Layout:** Breitensuche zur stabilen Berechnung von Ebenen (Levels), auch bei Rückschleifen.
- **Hierarchische Pfadführung:** Erster Nachfolger bleibt auf Y-Höhe des Vorgängers.
- **Kollisionsvermeidung:** Automatische Y-Verschiebung bei Überlagerungen in derselben Ebene.

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
* **1.1 Knoten-Mapping:** Erstellung einer `nodeMap`, um über die ID direkten Zugriff auf die `ProcessNode`-Objekte zu erhalten.
* **1.2 Adjazenzlisten-Transformation:** * Die ursprünglichen `predecessorIds` (Vorgänger) werden invertiert.
    * Eine `successorsMap` speichert für jeden Knoten seine direkten Nachfolger, um die Traversierung von links nach rechts zu ermöglichen.
* **1.3 Tracking & State:** * Ein `Set` namens `visited` verhindert die mehrfache Platzierung von Knoten (Vermeidung von Endlosschleifen bei Zyklen).
    * Eine `levelOccupancy`-Map speichert pro Ebene (X), welche vertikalen Slots (Y) bereits belegt sind.

### 2. Kern-Algorithmus (BFS-basiertes Layout)
Das Layout wird in "Komponenten" (zusammenhängende Teilgraphen) berechnet.

* **2.1 Identifikation der Wurzelknoten:**
    * Der Algorithmus sucht zuerst nach Knoten ohne Vorgänger (`predecessorIds.length === 0`).
    * Diese bilden die Startpunkte der Breitensuche (BFS) **in der Reihenfolge, wie sie in der JSON-Datei erscheinen**.
    * **Wichtig:** Die Reihenfolge der Wurzelknoten im JSON-Array bestimmt die vertikale Anordnung der Prozessbäume (von oben nach unten).
* **2.2 Ebenen-Berechnung (Horizontale Achse):**
    * Die X-Koordinate ergibt sich aus dem `level` (Distanz zum Startknoten).
    * Formel: `x = startX + (level * 160)`.
* **2.3 Positionierung & Kollisionsvermeidung (Vertikale Achse):**
    * **2.3.1 Initiales Target:** Ein Nachfolger wird primär auf der Y-Höhe seines Vorgängers eingeplant.
    * **2.3.2 Auffächerung:** Haben Knoten mehrere Kinder, werden diese mit einem Versatz von `100px` (ROW_HEIGHT) untereinander gestapelt.
    * **2.3.3 Dynamische Verschiebung:** Falls ein Slot belegt ist (`isYOccupied`), wird der Knoten rekursiv um jeweils 100px nach unten verschoben, bis ein freier Platz gefunden wird.
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
