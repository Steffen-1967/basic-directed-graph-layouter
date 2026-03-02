using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

using Serializer;

class Program
{
    static void Main()
    {
        string jsonFilePath = "tests/test-01.json";
        string htmlFilePath = "prozess-diagramm.html";
        
        // 1. JSON Einlesen
        if (!File.Exists(jsonFilePath))
        {
            Console.WriteLine($"Fehler: Die Datei {jsonFilePath} wurde nicht gefunden.");
            return;
        }

        string jsonString = File.ReadAllText(jsonFilePath);
            JsonSerializerOptions jsonOptions = new JsonSerializerOptions();
            jsonOptions.TypeInfoResolver = new ProcessItemTypeInfoResolver();
            List<ProcessItem>? items = JsonSerializer.Deserialize<List<ProcessItem>>(jsonString, options: jsonOptions);

        if (items != null)
        {
            // 2. Positionen berechnen
            var layouter = new Layouter();
            layouter.Calculate(items);

            // 3. HTML generieren
            //HtmlRendererWithSVG.Generate(items, htmlFilePath);
            HtmlRendererWithCanvas.Generate(items, htmlFilePath);

            Console.WriteLine($"Erfolg! Die Datei '{htmlFilePath}' wurde erfolgreich generiert.");
            Console.WriteLine("Du kannst sie nun mit einem beliebigen Webbrowser (Chrome, Firefox, Edge) öffnen.");
        }
    }

    
}