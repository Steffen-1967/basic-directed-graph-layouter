# mylife-app

Prozessvisualisierungs-Tool mit TypeScript/Canvas für komplexe gerichtete Graphen.

## Dokumentation
- **Projektbeschreibung & Status:** `./GEMINI.md`
- **Layout-Algorithmus & Routing:** `./layouter.md`
- **Laufzeitumgebung:** `./environment.md`

## Features
- ✅ Interaktive Szenarien-Auswahl (Dropdown)
- ✅ Auto-Zentrierung & Panning (Drag & Drop)
- ✅ Editierbarer Modus mit Toggle-Button (✏️ no/yes)
- ✅ Corner-Handles & Anchor-Handles beim Hover (12 Anker pro Knoten)
- ✅ Typabhängige Anchor-Positionierung (Event/Rule berühren Form)
- ✅ Intelligente Tooltips (Name + Description, max. 260px)
- ✅ Dynamische Canvas-Größe (Bounding Box + Margins)
- ✅ Rückschleifen-Support (Zyklen im Graphen)
- ✅ Cursor-Feedback (move/default je nach Kontext)
- ✅ SubProcess-Typ mit Plus-Symbol und doppelter Randstärke
- ✅ Hover-Effekt für Anchor-Handles (hellblau)
- ✅ Erweiterte Hover-Fläche im Edit-Modus (10px Expansion)
- ✅ Zentrale Konfiguration in manifest.js
- ✅ 4 Knotentypen: Event, Task, Rule, SubProcess

## Build & Run
```bash
npx ts-node src\index.ts
start out\graph.htm
```
