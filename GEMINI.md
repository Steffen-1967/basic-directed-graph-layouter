# Project: mylife-app

## Mission
Ein TypeScript-Programm, das eine Prozessvisualisierung als HTML-Seite (`graph.htm`) im Verzeichnis `/out` generiert. Das System unterstützt komplexe gerichtete Graphen inklusive Rückschleifen (Zyklen) und bietet interaktive Funktionen im Browser.

## Tech Stack
- TypeScript / Node.js
- HTML Canvas API
- ts-node

## Konventionen & Architektur
- **Ausgabe:** Alle generierten Dateien landen in `/out`. Die Hauptdatei ist `graph.htm`.
- **Datenquelle:** Dynamisches Einlesen aller `.json` Dateien aus `/data`.
- **Layout-Algorithmus:** 
    - **Robustes BFS-Layout:** Breitensuche zur stabilen Berechnung von Ebenen (Levels), auch bei Rückschleifen.
    - **Hierarchische Pfadführung:** Erster Nachfolger bleibt auf Y-Höhe des Vorgängers.
    - **Kollisionsvermeidung:** Automatische Y-Verschiebung bei Überlagerungen in derselben Ebene.
- **Kanten-Routing (Unified Routing):**
    - **Richtung:** Einlauf immer links, Auslauf immer rechts.
    - **Positionierung:** Vertikale Segmente verlaufen exakt in der Mitte zwischen zwei Knoten-Levels.
    - **Rückschleifen (Loops):** Weichen in einem Bogen aus (nach oben, wenn der Quellknoten in der obersten Pfadzeile liegt, sonst nach unten). Bogenhöhe beträgt 80% der Zeilenhöhe.
    - **Edge Routing an Rules:** Bündiger Anschluss an die diagonalen Ränder der Raute (mathematisch korrigiert).
- **Interaktivität:**
    - **Dateiauswahl:** Dropdown-Menü im Browser zum Wechseln zwischen Szenarien.
    - **Auto-Zentrierung:** Der Graph wird beim Laden oder Szenarienwechsel automatisch mittig im Viewport positioniert.
    - **Panning:** Verschieben durch Drag & Drop.
- **Sprache:** Quellcode-Kommentare in Englisch. Dokumentation in Deutsch oder Englisch.

## Aktueller Status
- **Layout & Routing:** Stabilisiert für Rückschleifen und komplexe Verzweigungen.
- **UI:** Interaktive Szenarien-Auswahl und Auto-Zentrierung implementiert.
- **Daten:** `test-01.json` und `test-02.json` (mit komplexen Loops) verfügbar.

## Nächste Schritte
- [ ] **Auto-Routing:** Vermeidung von Knotenüberschneidungen durch Kanten (Hindernisvermeidung).
- [ ] **Zoom-Funktionalität:** Mausrad-Zoom für große Graphen.
- [ ] **Interaktive Bearbeitung:** Drag & Drop von Knoten mit JSON-Update.
- [ ] **Sub-Prozesse:** Expandierbare Knoten für verschachtelte Abläufe.
- [ ] **Export:** SVG/PNG Download-Funktion.
