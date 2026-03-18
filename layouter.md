## Vorghensweise des Layouters (Version 1.0.0)
Der Algorithmus in der Funktion `calculateLayout` verwendet einen ebenenbasierten Ansatz (ähnlich dem Sugiyama-Prinzip), um Knoten eines gerichteten Graphen automatisch auf einer 2D-Fläche (Canvas) zu positionieren.

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
    * Diese werden sortiert und bilden die Startpunkte der Breitensuche (BFS).
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
