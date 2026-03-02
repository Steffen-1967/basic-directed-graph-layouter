# Copilot instructions for this repository

This repository is a small C# console tool that reads a JSON description of a directed graph (nodes with predecessor IDs), computes a simple depth-based layout and emits an HTML+SVG diagram (`prozess-diagramm.html`). Use these notes to make focused, minimal changes and to run/debug locally.

- **Big picture:** `src/Program.cs` is the single entry point. It:
  - Deserializes a `List<ProcessItem>` from `tests/test-01.json` (or `test-daten.json`).
  - Computes layout in `CalculateLayout()` by assigning a `depth` = max(predecessor depth)+1.
  - Generates HTML with positioned divs + SVG Bezier connectors in `GenerateHtml()` and writes `prozess-diagramm.html`.

- **Data format:** follow `tests/test-01.json` shape: objects with `id` (int), `type` ("Event"|"Task"|"Rule"), `name` (string), `predecessorIds` (array of ids).

- **Important implementation details / gotchas:**
  - The depth computation relies on previously-computed `depths` values. If a predecessor's depth is not yet in the dictionary, the code treats it as 0. Ordering of entries in the JSON may therefore affect layout. Keep simple graphs ordered from sources to sinks when adding test data.
  - Box sizing and spacing are hard-coded in `CalculateLayout()` (`Width=150`, `Height=60`, horizontal gap `220`, vertical gap `120`), and SVG curve offset `curveOffset = 50` is in `GenerateHtml()`.
  - Visual types map to CSS classes: `.Event`, `.Task`, `.Rule` in the generated HTML. Modify those strings in `GenerateHtml()` if you add new types.

- **Build & run (quick):**
  - Compile with the .NET C# compiler (Windows):
    - `csc src\\Program.cs -out:Program.exe`
    - `Program.exe` (runs; reads `tests/test-01.json` and writes `prozess-diagramm.html`).
  - If you prefer `dotnet` SDK, create a minimal console project and move `Program.cs` into it or run `dotnet run` from a project directory. This repo is a single-file program so direct `csc` is the fastest route.

- **Where to change behavior:**
  - Change input file path: alter `jsonFilePath` at top of `Main()`.
  - Change canvas size or styling: edit CSS lines in `GenerateHtml()` (look for `#canvas` and class rules).
  - Change layout spacing: edit values in `CalculateLayout()` (horizontal multiplier `220`, vertical `120`, offsets `50`).

- **Testing & debugging tips:**
  - Add or modify JSON in `tests/test-01.json` and re-run the compiled program.
  - Open `prozess-diagramm.html` in a browser to visually inspect edge routing and positions.
  - For deeper debugging, add `Console.WriteLine()` in `CalculateLayout()` to print assigned depths and coordinates.

- **Conventions / patterns to follow:**
  - Keep JSON source-to-target ordering to avoid unexpected depth defaults.
  - Preserve the `ProcessItem` property names (`id`, `type`, `name`, `predecessorIds`) — they match JSON attributes via `JsonPropertyName`.

- **No external integrations:** uses only `System.Text.Json` and the .NET runtime; there are no external web services or libraries to configure.

If any part is unclear or you'd like the instructions expanded (examples for adding new node types, tests, or converting to a multi-file project), tell me which section to expand.
