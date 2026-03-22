# Laufzeitumgebung

* NODE v.20.20.1
* NPM v.10.8.2

## Development and Test - Tools and Workflow

### Konsolen-Setup (2 Konsolen erforderlich)

**Konsole 1 (Aider/Development):**
- Hier arbeitest du mit Aider und führst Build-Befehle aus
- Beispiel: `npx ts-node src\index.ts` (generiert `out/graph.htm`)

**Konsole 2 (Server):**
- Hier läuft dauerhaft: `npm run server:dev`
- **Vollständiger Pfad-Befehl:** `C:\Users\[IhrBenutzername]\[Projektpfad]\mylife-app> npm run server:dev`
- **nodemon** überwacht automatisch Änderungen an `server/server.js` und `server/routes/*.js`
- Bei Änderungen startet der Server **automatisch neu**
- Ausgabe bei Neustart: `[nodemon] restarting due to changes...`

### Test-Endpunkte

- **http://localhost:3000** - Hauptanwendung (lädt `out/graph.htm`)
- **http://localhost:3000/api/scenarios** - API-Test (Liste aller Szenarien)
- **http://localhost:3000/api/scenario/test-01.json** - API-Test (Einzelnes Szenario)

### API-Tests mit curl

**Voraussetzungen:**
- Server muss laufen (`npm run server:dev` in zweiter Konsole)
- `curl` muss installiert sein (in Windows 10+ standardmäßig vorhanden)

**Test-Befehle:**

```bash
# Liste aller Szenarien abrufen
curl http://localhost:3000/api/scenarios

# Einzelnes Szenario laden
curl http://localhost:3000/api/scenario/test-01.json

# Health-Check
curl http://localhost:3000/api/health
```

**Erwartete Ausgaben:**

- `/api/scenarios`: JSON mit `{"success": true, "scenarios": [...], "count": 3}`
- `/api/scenario/test-01.json`: JSON mit `{"success": true, "fileName": "test-01.json", "data": [...]}`
- `/api/health`: JSON mit `{"status": "ok", "timestamp": "..."}`

### Workflow nach Code-Änderungen

| Änderung an | Aktion | Browser |
|-------------|--------|---------|
| **Client-Code** (`src/*.ts`, `src/*.js`) | `npx ts-node src\index.ts` ausführen | Neu laden (F5) |
| **Server-Code** (`server/*.js`) | Automatischer Neustart durch nodemon | Neu laden (F5) |
| **JSON-Daten** (`data/*.json`) | Keine Aktion nötig | Neu laden (F5) |

### Playwright End-to-End Tests

**Installation:**
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Konfiguration:**
- Konfigurationsdatei: `playwright.config.ts`
- Test-Verzeichnis: `./tests`
- **Wichtig:** Server muss **manuell** in separater Konsole gestartet werden
- `webServer.reuseExistingServer: true` - Nutzt immer den bereits laufenden Server

**Getestete Browser:**
- **Chromium** (Desktop Chrome)
- **Firefox** (Desktop Firefox)
- **Hinweis:** Playwright nutzt eigene, isolierte Browser-Instanzen, die unabhängig von den in Windows installierten Browsern sind
- Diese Browser werden bei `npx playwright install` heruntergeladen und in einem separaten Verzeichnis gespeichert

**Voraussetzungen für Tests:**
1. **Konsole 1:** Server starten mit `npm run server:dev`
2. **Alle Browser-Tabs der Anwendung schließen** (http://localhost:3000)
   - **Wichtig:** Schließe alle Tabs, die die App geöffnet haben
   - **Inkognito-Modus:** Reicht, nur Inkognito-Fenster zu schließen (normale Tabs können offen bleiben)
   - **Grund:** Vermeidung von Lock-Konflikten und LocalStorage-Interferenzen
3. **Konsole 2:** Tests ausführen mit `npx playwright test`

**Existierende Tests:**
- `tests/lock-system.spec.ts` - Multi-Tab Lock-System Tests
  - Testet WebSocket-basiertes Locking
  - Verifiziert Read-Only-Modus bei Lock-Konflikten
  - Prüft automatische Lock-Freigabe bei Tab-Schließung

**Test-Ausführung:**
```bash
# Alle Tests ausführen
npx playwright test

# Tests mit UI (interaktiv)
npx playwright test --ui

# Nur einen spezifischen Test
npx playwright test lock-system

# Test-Report anzeigen
npx playwright show-report
```

**Konfiguration (playwright.config.ts):**
- Timeout: 30 Sekunden pro Test
- Video-Recording: Deaktiviert (verhindert Hängenbleiben)
- Workers: 1 (sequentielle Ausführung für Lock-Tests)
- Browser: Chromium, Firefox

### Debugging-Tipps

- **Browser-Entwicklertools:** F12 öffnen
  - **Console-Tab:** Fehler und Warnungen anzeigen
  - **Network-Tab:** API-Requests und Responses überwachen
  - **WebSocket-Tab (Network):** WebSocket-Nachrichten live verfolgen
- **Server-Logs:** In Konsole 2 beobachten (WebSocket-Verbindungen, API-Requests)
- **Playwright Debug-Modus:** `npx playwright test --debug` (öffnet Inspector)

### Server-Logging-System

**Konfiguration:**
- **Log-Verzeichnis:** `logs/` (im Projektroot)
- **Rotation:** Täglich (neue Datei pro Tag)
- **Format:** JSON (strukturierte Logs)
- **Aufbewahrung:** 7 Tage (automatische Cleanup-Routine)

**Log-Datei-Namenskonvention:**
- Format: `app_YYYY-MM-DD.log`
- Beispiel: `app_2026-03-22.log`

**Automatische Cleanup-Routine:**
- Läuft beim Server-Start
- Löscht Log-Dateien älter als 7 Tage
- Console-Ausgabe: `[LOG] Starting cleanup of old log files...`
- Zeigt gelöschte Dateien mit Alter in Tagen an

**Log-Kategorien:**
- `SERVER` - Server-Lifecycle (Start, Shutdown)
- `WS` - WebSocket-Verbindungen
- `LOCK` - Lock-System-Events
- `API` - API-Requests und Responses

**Log-Levels:**
- `INFO` - Normale Operationen
- `WARN` - Warnungen (z.B. ungültige Requests)
- `ERROR` - Fehler (z.B. Datei nicht gefunden)

**Beispiel-Log-Eintrag:**
```json
{
  "timestamp": "2026-03-22T14:35:12.123Z",
  "level": "INFO",
  "category": "API",
  "message": "Scenario loaded",
  "details": {
    "fileName": "test-01.json",
    "nodeCount": 12
  }
}
```

**Client-seitiges Logging an Server:**
- Endpoint: `POST /api/log`
- Request-Body:
  ```json
  {
    "level": "error",
    "category": "CLIENT",
    "message": "Failed to load scenario",
    "details": { "error": "Network timeout" }
  }
  ```
- Verwendung im Client (zukünftig):
  ```javascript
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'error',
      category: 'CLIENT',
      message: 'Failed to load scenario',
      details: { error: 'Network timeout' }
    })
  });
  ```

**Log-Dateien manuell einsehen:**
- Pfad: `logs/app_YYYY-MM-DD.log`
- Format: Eine JSON-Zeile pro Log-Eintrag
- Empfohlene Tools:
  - **Windows:** `type logs\app_2026-03-22.log` (Console)
  - **Editor:** Visual Studio Code, Notepad++
  - **JSON-Viewer:** Online-Tools oder Browser-Extensions

### Multi-Tab-Verhalten

**Lock-System:**
- Nur ein Tab kann gleichzeitig ein Szenario bearbeiten
- Weitere Tabs werden automatisch in Read-Only-Modus versetzt
- Lock wird automatisch freigegeben bei:
  - Tab-Schließung
  - WebSocket-Verbindungsabbruch
  - Manueller Deaktivierung des Edit-Modus

**Ungespeicherte Änderungen bei Lock-Verlust:**
- LocalStorage-Snapshot bleibt erhalten
- Undo/Redo-Chain bleibt verfügbar
- Recovery-Dialog erscheint beim nächsten Laden
- Änderungen können später wiederhergestellt werden (wenn Lock verfügbar)

**✅ Implementierte Features:**

1. **Automatische Lock-Release-Benachrichtigung:**
   - ✅ Tab A wird automatisch benachrichtigt, wenn Tab B den Lock freigibt
   - ✅ Padlock-Icon und Edit-Button werden sofort aktualisiert
   - ✅ Console-Log: Bestätigung in Browser-Console sichtbar

2. **Recovery-Dialog mit Timestamp-Vergleich:**
   - ✅ Zeigt Datum/Uhrzeit der lokalen Änderungen
   - ✅ Warnt explizit, wenn Server-Datei neuer ist
   - ✅ Vergleicht Server-Timestamp vs. LocalStorage-Timestamp
   - ✅ Informierte Entscheidung durch User möglich

**⚠️ Bekannte Einschränkungen:**

1. **Konflikt-Risiko bei paralleler Bearbeitung:**
   - Wenn Tab A seine Änderungen wiederherstellt, während Tab B zwischenzeitlich gespeichert hat
   - Tab A überschreibt möglicherweise Tab B's Änderungen beim nächsten Speichern
   - **Empfehlung:** Nur ein Tab gleichzeitig verwenden für kritische Änderungen

**Best Practices für Multi-Tab-Nutzung:**
- ✅ Nur ein Tab für Bearbeitung verwenden
- ✅ Andere Tabs nur für Read-Only-Ansicht
- ✅ Bei Lock-Verlust: Seite neu laden statt Recovery (vermeidet Konflikte)
- ✅ Regelmäßig speichern (sobald Feature verfügbar)

**LocalStorage manuell leeren (optional):**
- Öffne Browser-Entwicklertools (F12)
- Gehe zum **Console-Tab**
- Führe aus: `localStorage.clear()`
- **Hinweis:** Löscht alle Undo/Redo-Snapshots für die aktuelle Domain
- **Wann nötig:** Normalerweise nicht - Playwright erzwingt bereits sauberen Zustand

**UI-Feedback:**
- 🔒 Geschlossenes Padlock: Read-Only oder gesperrt
- 🔓 Offenes Padlock: Bearbeitung aktiv
- Tooltip am Padlock-Icon: Zeigt Lock-Status und Holder-ID
- Modal-Dialog: Informiert über Lock-Übernahme durch anderen Tab
