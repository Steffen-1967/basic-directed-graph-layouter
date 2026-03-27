import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Generates the graph.htm file and copies supporting assets.
 */
function generateGraphHtml() {
    const outDir = path.join(__dirname, '..', 'out');
    const outFilePath = path.join(outDir, 'graph.htm');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    // List of files to copy to out directory (only assets not handled by tsc)
    const filesToCopy = [
        'app.css'
    ];
    filesToCopy.forEach(file => {
        const srcPath = path.join(__dirname, '..', 'src', file); // Look in src folder
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, path.join(outDir, file));
        }
        else {
            console.warn(`Warning: Asset ${file} not found in ${srcPath}`);
        }
    });
    // Copy Lucide Icons library
    const lucideSrc = path.join(__dirname, '..', 'node_modules', 'lucide', 'dist', 'umd', 'lucide.min.js');
    if (fs.existsSync(lucideSrc)) {
        fs.copyFileSync(lucideSrc, path.join(outDir, 'lucide.min.js'));
    }
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Life App - Optimized Layout</title>
    <link rel="stylesheet" href="app.css">
</head>
<body>
    <header>
        <label for="dataSelect">Scenario:</label>
        <select id="dataSelect"></select>
        <button id="loadBtn"><i data-lucide="file-digit"></i> Load</button>
        <span id="scenarioNameDisplay" style="margin-left: 10px; font-weight: bold; color: #495057;"></span>
        
        <button id="centerBtn" style="margin-left: auto;"><i data-lucide="maximize"></i> Center</button>
        <div class="v-divider"></div>
        <label>
            <span id="padlockIcon" class="padlock-icon">
                <i data-lucide="lock"></i>
            </span>
            Editable:
        </label>
        <button id="toggleEditableBtn"><i data-lucide="edit-3"></i> no</button>
        <button id="saveBtn" style="display: none;"><i data-lucide="save"></i> Save</button>
        <span id="dirtyIndicator">(unsaved changes)</span>
        
        <div class="v-divider"></div>
        <button id="undoBtn" title="Undo (Ctrl+Z)" disabled><i data-lucide="undo-2"></i> Undo</button>
        <button id="redoBtn" title="Redo (Ctrl+Y / Ctrl+Shift+Z)" disabled><i data-lucide="redo-2"></i> Redo</button>
    </header>
    <div id="canvasContainer">
        <canvas id="processCanvas"></canvas>
        <textarea id="nodeEditOverlay"></textarea>
        <div id="nodeToolboxOverlay"></div>
        <div id="edgeToolboxOverlay"></div>
        <div id="colorPickerOverlay"></div>
        <div id="edgeWeightOverlay"></div>
        <div id="tooltip" class="tooltip"></div>
        <div class="instructions"><b>Drag</b> to move | <b>Double-click node</b> to edit name | <b>Ctrl+Z/Y</b> for Undo/Redo</div>
    </div>
    
    <!-- Modals -->
    <div id="lockModal"><div id="lockModalContent"><h3><i data-lucide="alert-triangle"></i> Read-Only-Modus</h3><p id="lockModalMessage"></p><button id="lockModalOkBtn">OK</button></div></div>
    <div id="recoveryModal"><div id="recoveryModalContent"><h3><i data-lucide="refresh-cw"></i> Änderungen wiederherstellen?</h3><p id="recoveryModalMessage"></p><div class="modal-buttons"><button id="recoveryModalYesBtn">Ja</button><button id="recoveryModalNoBtn">Nein</button></div></div></div>
    <div id="leavePageModal"><div id="leavePageModalContent"><h3><i data-lucide="log-out"></i> Webseite verlassen?</h3><p id="leavePageModalMessage"></p><div class="modal-buttons"><button id="leavePageModalYesBtn">Ja</button><button id="leavePageModalNoBtn">Nein</button></div></div></div>
    
    <!-- Scripts -->
    <script src="lucide.min.js"></script>
    <script type="module" src="manifest.js"></script>
    <script type="module" src="layouterCalculate.js"></script>
    <script type="module" src="renderer.js"></script>
    <script type="module" src="historyManager.js"></script>
    <script type="module" src="actions.js"></script>
    <script type="module" src="logger.js"></script>
    <script type="module" src="app.js"></script>
    <script>
        // Initialize Lucide icons after everything is loaded
        window.addEventListener('DOMContentLoaded', () => {
            lucide.createIcons();
        });
    </script>
</body>
</html>`.trim();
    try {
        fs.writeFileSync(outFilePath, htmlContent, 'utf8');
        console.log(`Successfully generated: ${outFilePath}`);
    }
    catch (error) {
        console.error('Error generating the file:', error);
    }
}
generateGraphHtml();
