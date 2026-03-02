using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;

public static class HtmlRendererWithCanvas
{
        public static void Generate(List<ProcessItem> items, string outputPath)
        {
                StringBuilder html = new StringBuilder();

                html.AppendLine("<!DOCTYPE html>");
                html.AppendLine("<html lang='de'><head><meta charset='UTF-8'><title>Prozess Diagramm</title>");
                html.AppendLine("<style>");
                html.AppendLine("  body { font-family: Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }");
                html.AppendLine("  #canvas { position: relative; width: 2500px; height: 1000px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }");
                html.AppendLine("</style></head><body>");
                html.AppendLine("<h2>Generierter Prozessablauf (Canvas)</h2>");
                html.AppendLine("<div id='canvas'>");
                html.AppendLine("<canvas id='diagram' width='2500' height='1000' style='background:white; display:block;'></canvas>");

                // Embed items as JSON for the client-side script
                string itemsJson = JsonSerializer.Serialize(items);

                html.AppendLine("<script>");
                html.AppendLine($"const items = {itemsJson};");
                html.AppendLine(@"const canvas = document.getElementById('diagram');
const ctx = canvas.getContext('2d');
ctx.font = '12px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

function drawCurve(sx, sy, ex, ey) {
    const offset = 50;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + offset, sy, ex - offset, ey, ex, ey);
    ctx.strokeStyle = '#6c757d';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawPolygon(points, fillStyle, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function draw() {
    // draw connectors first
    for (const item of items) {
        for (const pId of item.predecessorIds) {
            const pred = items.find(i => i.id === pId);
            if (!pred) continue;
            const startX = pred.X + pred.Width;
            const startY = pred.Y + (pred.Height / 2);
            const endX = item.X;
            const endY = item.Y + (item.Height / 2);
            drawCurve(startX, startY, endX, endY);
        }
    }

    // draw items
    for (const item of items) {
        const x = item.X, y = item.Y, w = item.Width, h = item.Height;
        const type = item.type || 'Unknown';
        if (type === 'Event') {
            const x1 = x + Math.floor(w*0.2);
            const x2 = x + Math.floor(w*0.8);
            const yMid = y + Math.floor(h/2);
            const hex = [[x1,y],[x2,y],[x+w,yMid],[x2,y+h],[x1,y+h],[x,yMid]];
            drawPolygon(hex, '#ffc5ff', '#c728c7');
        } else if (type === 'Task') {
            const rect = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
            drawPolygon(rect, '#cce5ff', '#007bff');
        } else if (type === 'Rule') {
            const cx = x + Math.floor(w/2);
            const cy = y + Math.floor(h/2);
            const diamond = [[cx,y],[x+w,cy],[cx,y+h],[x,cy]];
            drawPolygon(diamond, '#fff3cd', '#ffc107');
        } else {
            const rect = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
            drawPolygon(rect, '#eeeeee', '#999999');
        }

        // labels
        ctx.fillStyle = '#222';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(item.name || '', x + w/2, y + h/2);
        ctx.fillStyle = '#555';
        ctx.font = '10px Arial';
        ctx.fillText('(ID: ' + item.id + ')', x + w/2, y + h/2 + h/3);
    }
}

draw();");

                html.AppendLine("</script>");
                html.AppendLine("</div></body></html>");

                File.WriteAllText(outputPath, html.ToString());
        }
}
