using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;

public static class HtmlRendererWithSVG
{
    public static void Generate(List<ProcessItem> items, string outputPath)
    {
        StringBuilder html = new StringBuilder();

        // --- HTML & CSS Header ---
        html.AppendLine("<!DOCTYPE html>");
        html.AppendLine("<html lang='de'><head><meta charset='UTF-8'><title>Prozess Diagramm</title>");
        html.AppendLine("<style>");
        html.AppendLine("  body { font-family: Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }");
        html.AppendLine("  #canvas { position: relative; width: 2500px; height: 1000px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }");
        
        // page-level and svg styles
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
        // --- 2. Items zeichnen als SVG-Shapes (anstatt HTML-DIVs) ---
        foreach (var item in items)
        {
            string cssType = item.Type ?? "Unknown";
            int x = item.X;
            int y = item.Y;
            int w = item.Width;
            int h = item.Height;

            string points = $"{x},{y} {x + w},{y} {x + w},{y + h} {x},{y + h}";
            if (cssType == "Event")
            {
                // six-corner polygon (hexagon-like) within the bounding box
                int x1 = x + (int)(w * 0.2);
                int x2 = x + (int)(w * 0.8);
                int yMiddle = y + (h / 2);
                string hexPoints = $"{x1},{y} {x2},{y} {x + w},{yMiddle} {x2},{y + h} {x1},{y + h} {x},{yMiddle}";
                html.AppendLine($"  <polygon points='{hexPoints}' fill='#ffc5ff' stroke='#c728c7' stroke-width='2' />");
            }
            else if (cssType == "Task")
            {
                html.AppendLine($"  <polygon points='{points}' fill='#cce5ff' stroke='#007bff' stroke-width='2' />");
            }
            else if (cssType == "Rule")
            {
                int cx = x + (w / 2);
                int cy = y + (h / 2);
                html.AppendLine($"  <polygon points='{cx},{y} {x + w},{cy} {cx},{y + h} {x},{cy}' fill='#fff3cd' stroke='#ffc107' stroke-width='2' />");
            }
            else
            {
                html.AppendLine($"  <polygon points='{points}' fill='#eeeeee' stroke='#999999' stroke-width='2' />");
            }

            string label = WebUtility.HtmlEncode(item.Name ?? string.Empty);
            int tx = x + (w / 2);
            int ty = y + (h / 2);
            html.AppendLine($"  <text x='{tx}' y='{ty}' text-anchor='middle' dominant-baseline='middle' style='font-size:12px; font-weight:bold; fill:#222'>{label}</text>");
            html.AppendLine($"  <text x='{tx}' y='{ty + (h/3)}' text-anchor='middle' style='font-size:10px; fill:#555'>(ID: {item.Id})</text>");
        }

        html.AppendLine("</svg>");
        html.AppendLine("</div></body></html>");

        // Datei speichern
        File.WriteAllText(outputPath, html.ToString());
    }
}
