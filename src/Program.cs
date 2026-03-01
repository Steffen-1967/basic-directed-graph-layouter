using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

class Program
{
    static void Main()
    {
        string jsonFilePath = "test-daten.json";
        string htmlFilePath = "prozess-diagramm.html";
        
        // 1. JSON Einlesen
        if (!File.Exists(jsonFilePath))
        {
            Console.WriteLine($"Fehler: Die Datei {jsonFilePath} wurde nicht gefunden.");
            return;
        }

        string jsonString = File.ReadAllText(jsonFilePath);
        List<ProcessItem> items = JsonSerializer.Deserialize<List<ProcessItem>>(jsonString);

        if (items != null)
        {
            // 2. Positionen berechnen
            CalculateLayout(items);

            // 3. HTML generieren
            GenerateHtml(items, htmlFilePath);

            Console.WriteLine($"Erfolg! Die Datei '{htmlFilePath}' wurde erfolgreich generiert.");
            Console.WriteLine("Du kannst sie nun mit einem beliebigen Webbrowser (Chrome, Firefox, Edge) öffnen.");
        }
    }

    static void CalculateLayout(List<ProcessItem> items)
    {
        Dictionary<int, int> depths = new Dictionary<int, int>();
        Dictionary<int, int> itemsPerDepth = new Dictionary<int, int>();

        foreach (var item in items)
        {
            item.Width = 150;
            item.Height = 60; // Etwas höher für mehr Text

            // Tiefe berechnen
            int depth = 0;
            if (item.PredecessorIds.Count > 0)
            {
                depth = item.PredecessorIds.Max(pId => depths.ContainsKey(pId) ? depths[pId] : 0) + 1;
            }
            depths[item.Id] = depth;

            if (!itemsPerDepth.ContainsKey(depth))
            {
                itemsPerDepth[depth] = 0;
            }
            int indexOnCurrentDepth = itemsPerDepth[depth];
            itemsPerDepth[depth]++;

            // Wir fügen einen Rand (Offset) von 50 Pixeln hinzu, damit es nicht am Rand klebt
            item.X = (depth * 220) + 50; 
            item.Y = (indexOnCurrentDepth * 120) + 50; 
        }
    }

    static void GenerateHtml(List<ProcessItem> items, string outputPath)
    {
        StringBuilder html = new StringBuilder();

        // --- HTML & CSS Header ---
        html.AppendLine("<!DOCTYPE html>");
        html.AppendLine("<html lang='de'><head><meta charset='UTF-8'><title>Prozess Diagramm</title>");
        html.AppendLine("<style>");
        html.AppendLine("  body { font-family: Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }");
        html.AppendLine("  #canvas { position: relative; width: 2500px; height: 1000px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }");
        
        // CSS für die Boxen
        html.AppendLine("  .process-box { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 12px; font-weight: bold; padding: 10px; box-sizing: border-box; box-shadow: 2px 2px 5px rgba(0,0,0,0.2); }");
        
        // Farbliche Unterscheidung der Typen
        html.AppendLine("  .Event { background-color: #d4edda; border: 2px solid #28a745; border-radius: 30px; }"); // Rund für Events
        html.AppendLine("  .Task { background-color: #cce5ff; border: 2px solid #007bff; border-radius: 6px; }"); // Eckig für Tasks
        html.AppendLine("  .Rule { background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 15px 0 15px 0; }"); // Rauten-ähnlich für Rules

        html.AppendLine("  svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }");
        html.AppendLine("  path { fill: none; stroke: #6c757d; stroke-width: 2; }");
        html.AppendLine("</style></head><body>");
        
        html.AppendLine("<h2>Generierter Prozessablauf</h2>");
        html.AppendLine("<div id='canvas'>");

        // --- 1. Verbindungslinien (SVG) zeichnen ---
        html.AppendLine("<svg>");
        // Pfeilspitze definieren
        html.AppendLine("  <defs><marker id='arrow' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='8' markerHeight='8' orient='auto-start-reverse'><path d='M 0 0 L 10 5 L 0 10 z' fill='#6c757d' /></marker></defs>");

        foreach (var item in items)
        {
            foreach (var pId in item.PredecessorIds)
            {
                var pred = items.FirstOrDefault(i => i.Id == pId);
                if (pred != null)
                {
                    // Startpunkt (Mitte der rechten Kante des Vorgängers)
                    int startX = pred.X + pred.Width;
                    int startY = pred.Y + (pred.Height / 2);

                    // Endpunkt (Mitte der linken Kante des aktuellen Elements)
                    int endX = item.X;
                    int endY = item.Y + (item.Height / 2);

                    // Bezier-Kurve für schöne gebogene Linien
                    int curveOffset = 50; 
                    html.AppendLine($"  <path d='M {startX} {startY} C {startX + curveOffset} {startY}, {endX - curveOffset} {endY}, {endX} {endY}' marker-end='url(#arrow)' />");
                }
            }
        }
        html.AppendLine("</svg>");

        // --- 2. HTML DIVs für die Objekte zeichnen ---
        foreach (var item in items)
        {
            html.AppendLine($"  <div class='process-box {item.Type}' style='left: {item.X}px; top: {item.Y}px; width: {item.Width}px; height: {item.Height}px;'>");
            html.AppendLine($"    {item.Name}<br><small style='color:#555;'>(ID: {item.Id})</small>");
            html.AppendLine($"  </div>");
        }

        html.AppendLine("</div></body></html>");

        // Datei speichern
        File.WriteAllText(outputPath, html.ToString());
    }
}

// --- Die Datenklasse ---
public class ProcessItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }[JsonPropertyName("type")]
    public string Type { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; }

    [JsonPropertyName("predecessorIds")]
    public List<int> PredecessorIds { get; set; } = new List<int>();
	[JsonIgnore] public int X { get; set; }
    [JsonIgnore] public int Y { get; set; }
    [JsonIgnore] public int Width { get; set; }
    [JsonIgnore] public int Height { get; set; }
}
