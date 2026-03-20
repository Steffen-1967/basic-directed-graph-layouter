import * as fs from 'fs';
import * as path from 'path';
const { calculateLayout, calculateGraphBoundings } = require('./layouterCalculate');

/**
 * Node structure based on the provided JSON data.
 */
interface ProcessNode {
    id: number;
    type: 'Event' | 'Task' | 'Rule';
    name: string;
    predecessorIds: number[];
    x?: number; 
    y?: number; 
    level?: number; 
    isTopRow?: boolean; 
}

const COLUMN_WIDTH = 160;
const ROW_HEIGHT = 100;

/**
 * Generates the graph.htm file with a canvas element in the /out directory.
 */
function generateGraphHtml(): void {
    const outDir = path.join(__dirname, '..', 'out');
    const dataDir = path.join(__dirname, '..', 'data');
    const outFilePath = path.join(outDir, 'graph.htm');

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const allTestData: { [key: string]: ProcessNode[] } = {};
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    
    files.forEach(file => {
        try {
            const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
            const nodes = JSON.parse(content);
            calculateLayout(nodes, COLUMN_WIDTH, ROW_HEIGHT); 
            allTestData[file] = nodes;
        } catch (e) {
            console.error(`Error loading ${file}:`, e);
        }
    });

    const testDataJson = JSON.stringify(allTestData);

    // Copy JS files to out directory
    fs.copyFileSync(path.join(__dirname, 'renderer.js'), path.join(outDir, 'renderer.js'));
    fs.copyFileSync(path.join(__dirname, 'layouterCalculate.js'), path.join(outDir, 'layouterCalculate.js'));

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Life App - Optimized Layout</title>
    <style>
        body { display: flex; flex-direction: column; height: 100vh; margin: 0; background-color: #f8f9fa; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
        header { padding: 10px 20px; background: #fff; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; gap: 20px; }
        #canvasContainer { flex: 1; position: relative; overflow: hidden; background-color: #e9ecef; display: flex; justify-content: center; align-items: center; }
        canvas { cursor: move; display: block; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        canvas:active { cursor: move; }
        .tooltip { position: absolute; background: rgba(33, 37, 41, 0.9); color: #fff; padding: 8px 12px; border-radius: 6px; pointer-events: none; display: none; font-size: 13px; z-index: 100; line-height: 1.4; max-width: 260px; }
        .tooltip-name { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
        .tooltip-desc { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
        .instructions { position: absolute; bottom: 15px; left: 15px; background: rgba(255, 255, 255, 0.85); padding: 8px 15px; font-size: 13px; border-radius: 20px; border: 1px solid #dee2e6; color: #495057; }
        select, button { padding: 5px 10px; border-radius: 4px; border: 1px solid #ced4da; }
        button { background-color: #007bff; color: white; border: none; cursor: pointer; }
        button:hover { background-color: #0056b3; }
        #toggleEditableBtn { background-color: #6c757d; padding: 5px 12px; }
        #toggleEditableBtn.editable-on { background-color: #ffc107; }
    </style>
</head>
<body>
    <header>
        <label for="dataSelect">Scenario:</label>
        <select id="dataSelect"></select>
        <button id="loadBtn">Load</button>
        <button id="centerBtn">Center graph</button>
        <label style="margin-left: 20px;">Editable:</label>
        <button id="toggleEditableBtn">✏️ no</button>
    </header>
    <div id="canvasContainer">
        <canvas id="processCanvas"></canvas>
        <div id="tooltip" class="tooltip"></div>
        <div class="instructions"><b>Drag</b> to move | <b>Hover</b> for info | <b>Auto-Centered</b> on load</div>
    </div>
    
    <!-- Link external JS files -->
    <script src="layouterCalculate.js"></script>
    <script src="renderer.js"></script>
    
    <script>
        const allTestData = ${testDataJson};
        const canvas = document.getElementById('processCanvas');
        const ctx = canvas.getContext('2d');
        const tooltip = document.getElementById('tooltip');
        const select = document.getElementById('dataSelect');
        const loadBtn = document.getElementById('loadBtn');
        const centerBtn = document.getElementById('centerBtn');
        const toggleEditableBtn = document.getElementById('toggleEditableBtn');

        const CONFIG = {
            colors: {
                Event: '#F8E1F1', Rule: '#FFFACD', Task: '#E0F7FA',
                Stroke: '#495057', Text: '#212529', Arrow: '#888'
            },
            sizes: {
                eventSize: 45,
                taskWidth: 130,
                taskHeight: 65,
                ruleSize: 45
            },
            colW: 160,
            rowH: 100
        };

        let nodes = [];
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        let startX, startY;
        let isEditable = false;

        function updateCanvasSize() {
            if (isEditable) {
                const container = document.getElementById('canvasContainer');
                canvas.width = container.clientWidth - 20;
                canvas.height = container.clientHeight - 20;
            } else {
                if (nodes.length === 0) {
                    canvas.width = 800;
                    canvas.height = 600;
                    return;
                }

                const boundings = calculateGraphBoundings(nodes, CONFIG.sizes);
                const marginX = 160 * 2;
                const marginY = 100 * 2;

                canvas.width = boundings.width + marginX;
                canvas.height = boundings.height + marginY;
            }
        }

        Object.keys(allTestData).forEach(fileName => {
            const opt = document.createElement('option');
            opt.value = fileName; opt.textContent = fileName; select.appendChild(opt);
        });

        function centerGraph() {
            if (nodes.length === 0) return;
            
            const boundings = calculateGraphBoundings(nodes, CONFIG.sizes);
            
            offsetX = (canvas.width - boundings.width) * 0.5 - boundings.minX;
            offsetY = (canvas.height - boundings.height) * 0.5 - boundings.minY;
            renderAll();
        }

        function renderAll() {
            render(ctx, canvas, offsetX, offsetY, nodes, CONFIG.colors, CONFIG.sizes, CONFIG.colW, CONFIG.rowH);
        }

        loadBtn.addEventListener('click', () => {
            nodes = allTestData[select.value];
            updateCanvasSize();
            centerGraph();
        });

        centerBtn.addEventListener('click', () => {
            centerGraph();
        });

        toggleEditableBtn.addEventListener('click', () => {
            isEditable = !isEditable;
            if (isEditable) {
                toggleEditableBtn.textContent = '✏️ yes';
                toggleEditableBtn.classList.add('editable-on');
                canvas.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.4)';
            } else {
                toggleEditableBtn.textContent = '✏️ no';
                toggleEditableBtn.classList.remove('editable-on');
                canvas.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
            }
            updateCanvasSize();
            centerGraph();
        });

        let hoveredNode = null;

        canvas.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX - offsetX; startY = e.clientY - offsetY; });
        window.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
            if (isDragging) { offsetX = e.clientX - startX; offsetY = e.clientY - startY; renderAll(); return; }
            const worldX = mouseX - offsetX; const worldY = mouseY - offsetY; 
            let foundNode = null;
            
            nodes.forEach(node => {
                let hit = false;
                if (node.type === 'Event') { const dx = worldX - node.x; const dy = worldY - node.y; if (dx*dx + dy*dy <= CONFIG.sizes.eventSize * 0.5*CONFIG.sizes.eventSize * 0.5) hit = true; }
                else if (node.type === 'Task') { if (worldX >= node.x - CONFIG.sizes.taskWidth*0.5 && worldX <= node.x + CONFIG.sizes.taskWidth*0.5 && worldY >= node.y - CONFIG.sizes.taskHeight*0.5 && worldY <= node.y + CONFIG.sizes.taskHeight*0.5) hit = true; }
                else if (node.type === 'Rule') { if (Math.abs(worldX - node.x) + Math.abs(worldY - node.y) <= CONFIG.sizes.ruleSize) hit = true; }
                
                if (hit) {
                    foundNode = node;
                }
            });
            
            if (isEditable) {
                // In editable mode: show handles
                if (foundNode !== hoveredNode) {
                    hoveredNode = foundNode;
                    renderAll();
                    if (hoveredNode) {
                        drawNodeHandles(ctx, hoveredNode, CONFIG.sizes, CONFIG.colors);
                    }
                }
                tooltip.style.display = 'none';
                canvas.style.cursor = foundNode ? 'default' : 'move';
            } else {
                // In non-editable mode: show tooltip
                if (foundNode) {
                    tooltip.style.left = (e.clientX + 15) + 'px'; 
                    tooltip.style.top = (e.clientY + 15) + 'px';
                    tooltip.innerHTML = \`<div><b>ID:</b> \${foundNode.id} | <b>Type:</b> \${foundNode.type}</div><div class="tooltip-name">\${foundNode.name}</div><div class="tooltip-desc">\${foundNode.description || 'N/A'}</div>\`;
                    tooltip.style.display = 'block';
                    canvas.style.cursor = 'default';
                } else {
                    tooltip.style.display = 'none';
                    canvas.style.cursor = 'move';
                }
                hoveredNode = null;
            }
        });
        window.addEventListener('mouseup', () => isDragging = false);

        window.addEventListener('resize', () => {
            updateCanvasSize();
            centerGraph();
        });

        // Initial load
        nodes = allTestData[select.value] || [];
        updateCanvasSize();
        centerGraph();
    </script>
</body>
</html>
    `.trim();

    try {
        fs.writeFileSync(outFilePath, htmlContent, 'utf8');
        console.log(`Successfully generated: ${outFilePath}`);
    } catch (error) {
        console.error('Error generating the file:', error);
    }
}

// Run the generator
generateGraphHtml();
