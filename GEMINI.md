# Project: mylife-app

## Mission
Ein TypeScript-Programm, das eine Prozessvisualisierung als HTML-Seite (`graph.htm`) im Verzeichnis `/out` generiert. Das System unterstützt komplexe gerichtete Graphen inklusive Rückschleifen (Zyklen) und bietet interaktive Funktionen im Browser.

## Tech Stack
- TypeScript / Node.js
- HTML Canvas API
- ts-node

## Konventionen & Architektur
- **Ausgabe:** Alle generierten Dateien landen in `/out`. Die Hauptdatei ist `graph.htm`.
- **Build-Prozess:** Änderungen werden nur in `/src` vorgenommen. Dateien in `/out` werden durch `npx ts-node src\index.ts` neu generiert.
- **Datenquelle:** Dynamisches Einlesen aller `.json` Dateien aus `/data`.
- **Layout-Algorithmus & Kanten-Routing:** Detaillierte Beschreibung siehe `./layouter.md`
- **Interaktivität:**
    - **Dateiauswahl:** Dropdown-Menü im Browser zum Wechseln zwischen Szenarien.
    - **Auto-Zentrierung:** Der Graph wird beim Laden oder Szenarienwechsel automatisch mittig im Viewport positioniert.
    - **Panning:** Verschieben durch Drag & Drop.
- **Sprache:** Quellcode-Kommentare in Englisch. Dokumentation in Deutsch oder Englisch.

## Aktueller Status
- **Layout & Routing:** Stabilisiert für Rückschleifen und komplexe Verzweigungen.
- **UI:** Interaktive Szenarien-Auswahl und Auto-Zentrierung implementiert.
- **Daten:** `test-01.json`, `test-02.json` und `test-03.json` verfügbar.
- **Canvas-Größe:** Dynamische Berechnung basierend auf Bounding Box mit Margins (2x COLUMN_WIDTH, 2x ROW_HEIGHT).
- **Zentrierung:** Graph wird auf Canvas-Größe zentriert (nicht auf Container).
- **Styling:** Canvas hat Schatten (`box-shadow: 0 4px 12px rgba(0,0,0,0.15)`).
- **Editierbarer Modus:** Toggle-Button zum Umschalten zwischen Ansichts- und Bearbeitungsmodus.
- **Handles:** Im editierbaren Modus werden beim Hover über Knoten Corner-Handles und Anchor-Handles angezeigt.

## Changelog
### 2026-03-21
- **Feature:** SubProcess-Typ hinzugefügt (Rechteck mit doppelter Randstärke und Plus-Symbol im unteren Rechteck)
- **Feature:** Hover-Funktionalität für SubProcess-Typ in beiden Modi (editierbar/nicht-editierbar)
- **Feature:** Hover-Fläche im Edit-Modus um vollen Anchor-Handle-Durchmesser (10px) erweitert
- **Feature:** Hover-Bereich für Rule-Typ auf quadratische Raute (Manhattan-Distanz) angepasst
- **Feature:** Hover-Effekt für Anchor-Handles mit hellblauer Füllfarbe (#ADD8E6)
- **Refactoring:** CONFIG aus `src\index.ts` in neue Datei `src\manifest.js` verschoben
- **Refactoring:** Layout-Variablen `columnWidth` und `rowHeight` mit `CONFIG.colW` und `CONFIG.rowH` initialisiert
- **Refactoring:** Füllfarbe für Task auf blasses Grün (#D4EDDA) geändert
- **Refactoring:** Füllfarbe für SubProcess auf Weiß (#FFFFFF) geändert
- **Refactoring:** Anchor-Handle-Farbe in CONFIG ausgelagert (#8c97ff)
- **Daten:** And-Split-Rule zwischen "Ausweis beantragen" und "Termin vereinbaren" in `test-01.json` eingefügt
- **Daten:** SubProcess "Ausweis erstellen" als zweiter Nachfolger der And-Split-Rule hinzugefügt

### 2026-03-20
- **Refactoring:** Numerische Werte auf 3 Nachkommastellen gekürzt (0.666666667 → 0.667)
- **Optimierung:** Verkettete Multiplikationen kombiniert (eventSize * 0.5 * 2.8 → eventSize * 1.4)
- **Bugfix:** Event-Offset-Berechnung korrigiert (eventRadius → eventSize * 0.5)
- **Feature:** Dynamische Canvas-Größenberechnung mit `calculateGraphBoundings()` implementiert
- **Feature:** Canvas-Zentrierung auf Canvas-Größe statt Container
- **Feature:** Editierbarer Modus mit Toggle-Button (✏️ no/yes) hinzugefügt
- **Feature:** Im editierbaren Modus nutzt Canvas den verfügbaren Platz (mit 10px Margin)
- **Feature:** Canvas-Schatten wechselt Farbe je nach Modus (grau-blau/grau-gelb)
- **Feature:** Corner-Handles (L-förmig, 10px Schenkellänge) an Bounding-Box-Ecken
- **Feature:** Anchor-Handles (Kreise, 10px Durchmesser) an Bounding-Box-Kanten (je 3 pro Seite)
- **Feature:** Bounding-Box nur um geometrische Form (ohne Text)
- **Feature:** Handles mit dunkelgrauer Strichfarbe und Strichstärke 2
- **Feature:** `description`-Eigenschaft zu allen JSON-Objekten hinzugefügt
- **Feature:** Tooltip zeigt jetzt ID, Type, Name und Description (max. 260px Breite, 3 Zeilen für Description)
- **Feature:** Cursor wechselt zu Standard-Pfeil beim Hover über Knoten (editierbar & nicht-editierbar)
- **Feature:** Canvas-Cursor ist jetzt `move` (4-Richtungs-Pfeil) statt `grab`
- **Refactoring:** `render.js` umbenannt zu `renderer.js`
- **Refactoring:** `calculateAnchorHandles()` aus `drawAnchorHandles()` extrahiert
- **Refactoring:** Anchor-Handles für Event/Rule-Typen werden typabhängig positioniert (berühren die Form)
- **Refactoring:** `getEventShift()` und `getRuleShift()` mit `edge` und `position` Parametern erweitert
- **Optimierung:** Anchor-Handles bei Event/Rule mit 1,5-fachem Offset und 0,5-facher Zusatzverschiebung
- **Dokumentation:** JSDoc-Kommentare in `renderer.js` nach Schema von `layouterCalculate.js` erweitert
- **Daten:** Aufgabennamen in `test-03.json` präzisiert (z.B. "Deployment" → "Artefakt deployen")
- **Daten:** Descriptions in `test-01.json` mit ausführlichen Texten befüllt

## Verwandte Dokumentation
- **Layout-Algorithmus & Kanten-Routing:** Siehe `./layouter.md` für detaillierte technische Beschreibung
- **Laufzeitumgebung:** Siehe `./environment.md`

## Technische Details

### Dateistruktur
```
mylife-app/
├── src/
│   ├── index.ts           # Hauptprogramm (HTML-Generator)
│   ├── renderer.js        # Canvas-Rendering-Logik
│   └── layouterCalculate.js  # Layout-Algorithmus
├── data/
│   ├── test-01.json       # Ausweis-Prozess (mit ausführlichen Descriptions)
│   ├── test-02.json       # Sonnenschein-Prozess
│   └── test-03.json       # Software-Entwicklungs-Prozess
├── out/
│   └── graph.htm          # Generierte HTML-Datei (mit kopierten JS-Dateien)
├── GEMINI.md              # Projektdokumentation
├── layouter.md            # Layout-Algorithmus & Rendering-Details
├── environment.md         # Laufzeitumgebung
└── README.md              # Kurzübersicht
```

### JSON-Datenstruktur
Jeder Knoten hat folgende Eigenschaften:
```json
{
  "id": 1,
  "type": "Event|Task|Rule|SubProcess",
  "name": "Kurzer Titel",
  "description": "Ausführliche Beschreibung (wird im Tooltip angezeigt)",
  "predecessorIds": [2, 3]
}
```

**Knotentypen:**
- **Event:** Kreis (45px Durchmesser), rosa Füllung (#F8E1F1)
- **Task:** Abgerundetes Rechteck (110×65px), blassgrüne Füllung (#D4EDDA)
- **Rule:** Raute (45px Diagonale), gelbe Füllung (#FFFACD)
- **SubProcess:** Abgerundetes Rechteck (110×65px) mit doppelter Randstärke (4px), weiße Füllung (#FFFFFF), kleines Rechteck mit Plus-Symbol am unteren Rand

### Konstanten & Konfiguration
Die zentrale Konfiguration befindet sich in `src\manifest.js`:

```javascript
const CONFIG = {
    colors: {
        Event: '#F8E1F1',              // Rosa
        Rule: '#FFFACD',               // Gelb
        Task: '#D4EDDA',               // Blassgrün
        SubProcess: '#FFFFFF',         // Weiß
        Stroke: '#495057',             // Dunkelgrau
        Text: '#212529',               // Fast Schwarz
        Arrow: '#888',                 // Grau
        AnchorHandle: '#8c97ff',       // Blau-Violett
        AnchorHandleHover: '#ADD8E6'   // Hellblau
    },
    sizes: {
        taskWidth: 110,
        taskHeight: 65,
        eventSize: 45,
        ruleSize: 45,
        subProcessWidth: 110,
        subProcessHeight: 65,
        subProcessSquareSize: 12,
        eventHandleShiftOnSize1: 0.07,
        eventHandleShiftOnSize2: 0.27,
        ruleHandleShiftOnSize1: 0.17,
        ruleHandleShiftOnSize2: 0.34
    },
    colW: 140,    // Horizontaler Abstand zwischen Ebenen
    rowH: 100     // Vertikaler Abstand zwischen Zeilen
};

// Handles (in renderer.js)
HANDLE_OFFSET = 2              // Abstand Handle zu Bounding Box
CORNER_HANDLE_SIZE = 10        // Schenkellänge L-Form
ANCHOR_HANDLE_DIAMETER = 10    // Durchmesser Anker-Kreis
HANDLE_STROKE_WIDTH = 2        // Linienstärke
```

## Nächste Schritte
- [ ] **Handle-Interaktion:** Drag & Drop von Corner-Handles (Resize) und Anchor-Handles (Verbindungen)
- [ ] **Knoten-Verschiebung:** Drag & Drop von Knoten im editierbaren Modus mit JSON-Update
- [ ] **Verbindungen erstellen:** Drag von Anchor-Handle zu Anchor-Handle zum Erstellen neuer Kanten
- [ ] **Auto-Routing:** Vermeidung von Knotenüberschneidungen durch Kanten (Hindernisvermeidung)
- [ ] **Zoom-Funktionalität:** Mausrad-Zoom für große Graphen
- [ ] **Sub-Prozesse:** Expandierbare Knoten für verschachtelte Abläufe (✅ Basis-Typ implementiert)
- [ ] **Export:** SVG/PNG Download-Funktion
- [ ] **Persistenz:** Speichern von Layout-Änderungen zurück in JSON-Dateien
- [ ] **Weitere Node-Typen:** Gateway-Typen (XOR, OR, AND) mit unterschiedlichen Symbolen
- [ ] **Verbesserte Anchor-Handle-Interaktion:** Visuelles Feedback beim Drag-Start
