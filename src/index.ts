import * as fs from 'fs';
import * as path from 'path';
const { CONFIG } = require('./manifest');

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


    // Copy JS files to out directory
    fs.copyFileSync(path.join(__dirname, 'manifest.js'), path.join(outDir, 'manifest.js'));
    fs.copyFileSync(path.join(__dirname, 'renderer.js'), path.join(outDir, 'renderer.js'));
    fs.copyFileSync(path.join(__dirname, 'layouterCalculate.js'), path.join(outDir, 'layouterCalculate.js'));
    fs.copyFileSync(path.join(__dirname, 'historyManager.js'), path.join(outDir, 'historyManager.js'));
    fs.copyFileSync(path.join(__dirname, 'actions.js'), path.join(outDir, 'actions.js'));
    fs.copyFileSync(path.join(__dirname, 'logger.js'), path.join(outDir, 'logger.js'));

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Life App - Optimized Layout</title>
    <style>
        body { display: flex; flex-direction: column; height: 100vh; margin: 0; background-color: #f8f9fa; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
        header { padding: 10px 20px; background: #fff; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; gap: 15px; }
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
        button:disabled { background-color: #ccc; cursor: default; }
        #toggleEditableBtn { background-color: #6c757d; padding: 5px 12px; }
        #toggleEditableBtn.editable-on { background-color: #ffc107; }
        #nodeEditOverlay { 
            position: absolute; 
            display: none; 
            background: white; 
            border: 1px solid #007bff; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.2); 
            z-index: 1000; 
            font-family: Arial; 
            font-size: 10px; 
            text-align: center; 
            resize: none; 
            overflow: hidden;
            outline: none;
            line-height: 1.4;
            box-sizing: border-box;
        }
        #dirtyIndicator {
            margin-left: 10px;
            color: #dc3545;
            font-weight: bold;
            display: none;
        }
        .v-divider { width: 1px; height: 24px; background: #dee2e6; margin: 0 5px; }
        #lockModal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        #lockModalContent {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            text-align: center;
        }
        #lockModalContent h3 {
            margin-top: 0;
            color: #dc3545;
        }
        #lockModalContent button {
            margin-top: 20px;
            padding: 8px 24px;
        }
        .padlock-icon {
            font-size: 16px;
            margin-right: 5px;
            cursor: help;
            position: relative;
        }
        .padlock-tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(33, 37, 41, 0.95);
            color: white;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            margin-bottom: 5px;
            z-index: 1000;
        }
        .padlock-icon:hover .padlock-tooltip {
            opacity: 1;
        }
    </style>
</head>
<body>
    <header>
        <label for="dataSelect">Scenario:</label>
        <select id="dataSelect"></select>
        <button id="loadBtn">Load</button>
        <button id="centerBtn">Center graph</button>
        <div class="v-divider"></div>
        <button id="undoBtn" title="Undo (Ctrl+Z)" disabled>↩️ Undo</button>
        <button id="redoBtn" title="Redo (Ctrl+Y / Ctrl+Shift+Z)" disabled>↪️ Redo</button>
        <div class="v-divider"></div>
        <label>
            <span id="padlockIcon" class="padlock-icon">
                🔒
                <span id="padlockTooltip" class="padlock-tooltip">Verfügbar für Bearbeitung</span>
            </span>
            Editable:
        </label>
        <button id="toggleEditableBtn">✏️ no</button>
        <span id="dirtyIndicator">(unsaved changes)</span>
    </header>
    <div id="canvasContainer">
        <canvas id="processCanvas"></canvas>
        <textarea id="nodeEditOverlay"></textarea>
        <div id="tooltip" class="tooltip"></div>
        <div class="instructions"><b>Drag</b> to move | <b>Double-click node</b> to edit name | <b>Ctrl+Z/Y</b> for Undo/Redo</div>
    </div>
    
    <!-- Lock Modal Dialog -->
    <div id="lockModal">
        <div id="lockModalContent">
            <h3>⚠️ Read-Only-Modus</h3>
            <p id="lockModalMessage"></p>
            <button id="lockModalOkBtn">OK</button>
        </div>
    </div>
    
    <!-- Link external JS files -->
    <script src="manifest.js"></script>
    <script src="layouterCalculate.js"></script>
    <script src="renderer.js"></script>
    <script src="historyManager.js"></script>
    <script src="actions.js"></script>
    <script src="logger.js"></script>
        
    <script>
        const canvas = document.getElementById('processCanvas');
        const ctx = canvas.getContext('2d');
        const tooltip = document.getElementById('tooltip');
        const select = document.getElementById('dataSelect');
        const loadBtn = document.getElementById('loadBtn');
        const centerBtn = document.getElementById('centerBtn');
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const toggleEditableBtn = document.getElementById('toggleEditableBtn');
        const nodeEditOverlay = document.getElementById('nodeEditOverlay');
        const dirtyIndicator = document.getElementById('dirtyIndicator');
        const padlockIcon = document.getElementById('padlockIcon');
        const padlockTooltip = document.getElementById('padlockTooltip');
        const lockModal = document.getElementById('lockModal');
        const lockModalMessage = document.getElementById('lockModalMessage');
        const lockModalOkBtn = document.getElementById('lockModalOkBtn');

        const OVERLAY_PADDING = 2;

        // Initialize Loggers
        const wsLogger = new Logger('WS');
        const lockLogger = new Logger('LOCK');
        const apiLogger = new Logger('API');
        const historyLogger = new Logger('HISTORY');

        // WebSocket connection
        let ws = null;
        let clientId = null;
        let currentScenarioLock = null; // { scenario: string, holder: string }
        let isLockedByOther = false;

        let nodes = [];
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        let startX, startY;
        let isEditable = false;
        let editingNode = null;
        let lastMouseX = 0;
        let lastMouseY = 0;

        // Initialize History Manager
        const history = new HistoryManager({ persistenceKey: 'mylife_snapshot_' + select.value });

        // WebSocket connection setup
        function connectWebSocket() {
            ws = new WebSocket('ws://localhost:3000');
            
            ws.onopen = () => {
                wsLogger.log('Connected to server');
            };
            
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleWebSocketMessage(msg);
                } catch (e) {
                    wsLogger.error('Error parsing message:', e);
                }
            };
            
            ws.onerror = (error) => {
                wsLogger.error('WebSocket error:', error);
            };
            
            ws.onclose = () => {
                wsLogger.log('Connection closed. Reconnecting in 3 seconds...');
                setTimeout(connectWebSocket, 3000);
            };
        }

        function handleWebSocketMessage(msg) {
            switch (msg.type) {
                case 'connected':
                    clientId = msg.clientId;
                    wsLogger.log('Client ID:', clientId);
                    // Check lock status for current scenario
                    if (select.value) {
                        requestLockStatus(select.value);
                    }
                    break;
                    
                case 'lock_response':
                    if (msg.success) {
                        isEditable = true;
                        isLockedByOther = false;
                        currentScenarioLock = { scenario: msg.scenario, holder: clientId };
                        updateEditButton();
                        updatePadlockIcon();
                    } else {
                        isEditable = false;
                        isLockedByOther = true;
                        currentScenarioLock = { scenario: msg.scenario, holder: msg.holder };
                        showLockModal('Dieses Szenario wird von einem anderen Tab bearbeitet (ID: ' + msg.holder.substring(0, 8) + '). Sie können nur im Read-Only-Modus arbeiten.');
                        updateEditButton();
                        updatePadlockIcon();
                    }
                    break;
                    
                case 'lock_acquired':
                    if (msg.holder !== clientId && msg.scenario === select.value) {
                        isEditable = false;
                        isLockedByOther = true;
                        currentScenarioLock = { scenario: msg.scenario, holder: msg.holder };
                        showLockModal('Ein anderer Tab hat die Bearbeitung übernommen (ID: ' + msg.holder.substring(0, 8) + '). Sie sind jetzt im Read-Only-Modus.');
                        updateEditButton();
                        updatePadlockIcon();
                    }
                    break;
                    
                case 'lock_released':
                    if (msg.scenario === select.value) {
                        const wasLockedByOther = isLockedByOther;
                        isLockedByOther = false;
                        currentScenarioLock = null;
                        updateEditButton();
                        updatePadlockIcon();
                        
                        // Notify user if they were waiting for the lock
                        if (wasLockedByOther && msg.releasedBy !== clientId) {
                            lockLogger.log('Scenario is now available for editing');
                            // Optional: Show non-blocking notification
                            // showLockModal('Das Szenario ist jetzt verfügbar für die Bearbeitung.');
                        }
                    }
                    break;
                    
                case 'lock_release_confirmed':
                    // Server confirmed our lock release
                    lockLogger.log('Lock release confirmed for:', msg.scenario);
                    break;
                    
                case 'lock_status':
                    if (msg.locked && msg.holder !== clientId) {
                        isLockedByOther = true;
                        currentScenarioLock = { scenario: msg.scenario, holder: msg.holder };
                        const holderId = msg.holder ? msg.holder.substring(0, 8) : 'unbekannt';
                        showLockModal('Dieses Szenario wird bereits bearbeitet (ID: ' + holderId + '). Sie können nur im Read-Only-Modus arbeiten.');
                    } else {
                        isLockedByOther = false;
                        currentScenarioLock = null;
                    }
                    updateEditButton();
                    updatePadlockIcon();
                    break;
            }
        }

        function requestLockStatus(scenario) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'lock_status',
                    scenario: scenario
                }));
            }
        }

        function requestLock(scenario) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'lock_request',
                    scenario: scenario
                }));
            }
        }

        function releaseLock(scenario) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'lock_release',
                    scenario: scenario
                }));
            }
        }

        function showLockModal(message) {
            lockModalMessage.textContent = message;
            lockModal.style.display = 'flex';
        }

        function hideLockModal() {
            lockModal.style.display = 'none';
        }

        lockModalOkBtn.addEventListener('click', hideLockModal);

        function updatePadlockIcon() {
            const iconSpan = padlockIcon.querySelector('span') ? padlockIcon : padlockIcon.parentElement;
            const icon = iconSpan.childNodes[0];
            
            if (isLockedByOther) {
                icon.textContent = '🔒';
                const holderId = (currentScenarioLock && currentScenarioLock.holder) 
                    ? currentScenarioLock.holder.substring(0, 8) 
                    : 'unbekannt';
                padlockTooltip.textContent = 'Gesperrt von Tab: ' + holderId;
            } else if (isEditable) {
                icon.textContent = '🔓';
                padlockTooltip.textContent = 'Bearbeitung aktiv';
            } else {
                icon.textContent = '🔒';
                padlockTooltip.textContent = 'Verfügbar für Bearbeitung';
            }
        }

        function updateEditButton() {
            if (isLockedByOther) {
                toggleEditableBtn.disabled = true;
                toggleEditableBtn.textContent = '✏️ locked';
                toggleEditableBtn.classList.remove('editable-on');
            } else if (isEditable) {
                toggleEditableBtn.disabled = false;
                toggleEditableBtn.textContent = '✏️ yes';
                toggleEditableBtn.classList.add('editable-on');
            } else {
                toggleEditableBtn.disabled = false;
                toggleEditableBtn.textContent = '✏️ no';
                toggleEditableBtn.classList.remove('editable-on');
            }
        }

        // Connect WebSocket on page load
        connectWebSocket();

        function updateCanvasSize() {
            if (isEditable) {
                const container = document.getElementById('canvasContainer');
                canvas.width = container.clientWidth - 20;
                canvas.height = container.clientHeight - 20;
            } else {
                if (nodes.length === 0) { canvas.width = 800; canvas.height = 600; return; }
                const boundings = calculateGraphBoundings(nodes, CONFIG.sizes);
                const marginX = 160 * 2;
                const marginY = 100 * 2;
                canvas.width = boundings.width + marginX;
                canvas.height = boundings.height + marginY;
            }
        }


        function centerGraph() {
            if (nodes.length === 0) return;
            const boundings = calculateGraphBoundings(nodes, CONFIG.sizes);
            offsetX = (canvas.width - boundings.width) * 0.5 - boundings.minX;
            offsetY = (canvas.height - boundings.height) * 0.5 - boundings.minY;
            renderAll();
        }

        function renderAll() {
            render(ctx, canvas, offsetX, offsetY, nodes, CONFIG.sizes, CONFIG.colors, CONFIG.colW, CONFIG.rowH);
            if (isEditable && hoveredNode) {
                drawNodeHandles(ctx, hoveredNode, CONFIG.sizes, CONFIG.colors, hoveredHandle);
            }
            updateHistoryButtons();
        }

        function setDirty(value) {
            nodes.isDirty = value;
            dirtyIndicator.style.display = value ? 'inline' : 'none';
        }

        function updateHistoryButtons() {
            undoBtn.disabled = history.undoStack.length === 0;
            redoBtn.disabled = history.redoStack.length === 0;
            setDirty(history.isDirty());
        }

        function updateHoverState(mouseX, mouseY) {
            const worldX = mouseX - offsetX; 
            const worldY = mouseY - offsetY; 
            let foundNode = null;
            const hoverExpansion = 10; 
            
            // Defensive: Check if hoveredNode still exists
            if (hoveredNode && !nodes.find(n => n.id === hoveredNode.id)) {
                historyLogger.warn('hoveredNode no longer exists in nodes array. Resetting.');
                hoveredNode = null;
                hoveredHandle = null;
            }
            
            // Defensive: Check if editingNode still exists
            if (editingNode && !nodes.find(n => n.id === editingNode.id)) {
                historyLogger.warn('editingNode no longer exists in nodes array. Closing editor.');
                editingNode = null;
                nodeEditOverlay.style.display = 'none';
            }
            
            nodes.forEach(node => {
                let hit = false;
                if (node.type === 'Event') { 
                    const dx = worldX - node.x, dy = worldY - node.y; 
                    const r = CONFIG.sizes.eventSize * 0.5 + hoverExpansion;
                    if (dx*dx + dy*dy <= r * r) hit = true; 
                } else if (node.type === 'Task' || node.type === 'SubProcess') { 
                    const w = (node.type === 'Task' ? CONFIG.sizes.taskWidth : CONFIG.sizes.subProcessWidth) * 0.5 + hoverExpansion;
                    const h = (node.type === 'Task' ? CONFIG.sizes.taskHeight : CONFIG.sizes.subProcessHeight) * 0.5 + hoverExpansion;
                    if (worldX >= node.x - w && worldX <= node.x + w && worldY >= node.y - h && worldY <= node.y + h) hit = true; 
                } else if (node.type === 'Rule') { 
                    if (Math.abs(worldX - node.x) + Math.abs(worldY - node.y) <= CONFIG.sizes.ruleSize * 0.5 + hoverExpansion) hit = true; 
                }
                if (hit) foundNode = node;
            });
            
            if (isEditable) {
                let foundHandle = null;
                if (foundNode) {
                    const bbox = calculateNodeBoundingBox(foundNode, CONFIG.sizes);
                    const anchors = calculateAnchorHandles(bbox, foundNode.type, foundNode.x, foundNode.y, CONFIG.sizes);
                    for (const [key, anchor] of Object.entries(anchors)) {
                        const dx = worldX - anchor.x, dy = worldY - anchor.y;
                        if (Math.sqrt(dx * dx + dy * dy) <= (typeof ANCHOR_HANDLE_DIAMETER !== 'undefined' ? ANCHOR_HANDLE_DIAMETER : 8) * 0.5) { foundHandle = key; break; }
                    }
                }
                if (foundNode !== hoveredNode || foundHandle !== hoveredHandle) {
                    hoveredNode = foundNode; hoveredHandle = foundHandle; renderAll();
                }
                tooltip.style.display = 'none';
                canvas.style.cursor = foundNode ? 'default' : 'move';
            } else {
                if (foundNode) {
                    const shortId = typeof foundNode.id === 'string' ? foundNode.id.substring(0, 8) : foundNode.id;
                    tooltip.style.left = (mouseX + 15 + canvas.offsetLeft) + 'px'; 
                    tooltip.style.top = (mouseY + 15 + canvas.offsetTop) + 'px';
                    tooltip.innerHTML = \`<div><b>ID:</b> \${shortId} | <b>Type:</b> \${foundNode.type}</div><div class="tooltip-name">\${foundNode.name}</div><div class="tooltip-desc">\${foundNode.description || 'N/A'}</div>\`;
                    tooltip.style.display = 'block'; canvas.style.cursor = 'default';
                } else {
                    tooltip.style.display = 'none'; canvas.style.cursor = 'move';
                }
                hoveredNode = null;
            }
        }

        window.addEventListener('beforeunload', (e) => {
            if (history.isDirty()) {
                e.preventDefault();
                e.returnValue = ''; // Standard browser dialog
            }
        });

        function saveEdit() {
            if (editingNode) {
                const newName = nodeEditOverlay.value.trim();
                if (newName !== editingNode.name) {
                    const action = new UpdatePropertyAction(nodes, editingNode.id, 'name', newName, editingNode.name);
                    history.execute(action, nodes);
                }
                editingNode = null;
                nodeEditOverlay.style.display = 'none';
                updateHoverState(lastMouseX, lastMouseY);
                renderAll();
            }
        }

        nodeEditOverlay.addEventListener('blur', saveEdit);
        nodeEditOverlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                editingNode = null;
                nodeEditOverlay.style.display = 'none';
                updateHoverState(lastMouseX, lastMouseY);
                renderAll();
            }
        });

        async function loadData(fileName, forceRecover = true) {
            // Release lock on previous scenario
            if (currentScenarioLock && currentScenarioLock.holder === clientId) {
                releaseLock(currentScenarioLock.scenario);
            }
            
            // Reset edit mode
            isEditable = false;
            isLockedByOther = false;
            currentScenarioLock = null;
            canvas.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
            updateEditButton();
            updatePadlockIcon();
            
            // Wait for WebSocket connection before proceeding
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                apiLogger.log('Waiting for WebSocket connection...');
                await new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 5000);
                });
            }
            
            history.persistenceKey = 'mylife_snapshot_' + fileName;
            let dataLoaded = false;
            
            if (forceRecover) {
                const recovered = history.recover();
                if (recovered) {
                    // Fetch current server timestamp for comparison
                    let serverTimestamp = null;
                    try {
                        const response = await fetch('/api/scenario/' + fileName);
                        const result = await response.json();
                        if (result.success) {
                            serverTimestamp = result.lastModified;
                        }
                    } catch (e) {
                        apiLogger.warn('Could not fetch server timestamp for comparison (server might be offline or unreachable)');
                    }
                    
                    // Build recovery message
                    let message = 'Ungespeicherte Änderungen für "' + fileName + '" gefunden.\\n\\n';
                    
                    if (recovered.timestamp) {
                        const localDate = new Date(recovered.timestamp);
                        message += 'Ihre Änderungen vom: ' + localDate.toLocaleString('de-DE') + '\\n';
                    }
                    
                    if (serverTimestamp && recovered.serverTimestamp) {
                        if (serverTimestamp > recovered.serverTimestamp) {
                            const serverDate = new Date(serverTimestamp);
                            message += '\\n⚠️ WARNUNG: Die Datei auf dem Server wurde zwischenzeitlich geändert!\\n';
                            message += 'Server-Version vom: ' + serverDate.toLocaleString('de-DE') + '\\n\\n';
                            message += 'Wenn Sie Ihre Änderungen wiederherstellen, könnten Sie neuere Daten überschreiben.\\n\\n';
                        }
                    }
                    
                    message += 'Möchten Sie Ihre Änderungen wiederherstellen?';
                    
                    if (confirm(message)) {
                        nodes = recovered.nodes;
                        // Restore server timestamp for future comparisons
                        if (recovered.serverTimestamp) {
                            nodes.serverTimestamp = recovered.serverTimestamp;
                        }
                        dataLoaded = true;
                    }
                }
            }
            
            if (!dataLoaded) {
                try {
                    const response = await fetch('/api/scenario/' + fileName);
                    const result = await response.json();
                    
                    if (result.success) {
                        const rawData = result.data;
                        nodes = validateAndTransformGraph(rawData);
                        evolveSuccessors(nodes);
                        calculateLayout(nodes, CONFIG.colW, CONFIG.rowH);
                        history.clear();
                        
                        // Store server timestamp for conflict detection
                        nodes.serverTimestamp = result.lastModified;
                    } else {
                        apiLogger.error('Failed to load scenario:', result.error);
                        alert('Fehler beim Laden des Szenarios: ' + fileName);
                        return;
                    }
                } catch (error) {
                    apiLogger.error('Network error loading scenario:', error);
                    alert('Netzwerkfehler beim Laden von: ' + fileName);
                    return;
                }
            }
            
            hoveredNode = null;
            hoveredHandle = null;
            editingNode = null;
            nodeEditOverlay.style.display = 'none';
            updateCanvasSize();
            centerGraph();
            updateHistoryButtons();
            
            // Check lock status for new scenario and wait for response
            if (ws && ws.readyState === WebSocket.OPEN) {
                requestLockStatus(fileName);
                // Give server time to respond with lock status
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        loadBtn.addEventListener('click', () => {
            loadData(select.value);
        });

        undoBtn.addEventListener('click', () => {
            history.undo(nodes);
            renderAll();
        });

        redoBtn.addEventListener('click', () => {
            history.redo(nodes);
            renderAll();
        });

        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    if (e.shiftKey) history.redo(nodes);
                    else history.undo(nodes);
                    renderAll();
                } else if (e.key === 'y') {
                    history.redo(nodes);
                    renderAll();
                }
            }
        });

        centerBtn.addEventListener('click', () => { centerGraph(); });

        toggleEditableBtn.addEventListener('click', () => {
            if (isLockedByOther) return; // Should not happen (button is disabled)
            
            if (!isEditable) {
                // Request lock from server
                requestLock(select.value);
            } else {
                // Release lock
                releaseLock(select.value);
                isEditable = false;
                canvas.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
                hoveredNode = null;
                hoveredHandle = null;
                editingNode = null;
                nodeEditOverlay.style.display = 'none';
                updateEditButton();
                updatePadlockIcon();
                updateCanvasSize();
                centerGraph();
            }
        });

        let hoveredNode = null;
        let hoveredHandle = null;

        // Load scenarios from server
        async function loadScenariosFromServer() {
            try {
                const response = await fetch('/api/scenarios');
                const data = await response.json();
                
                if (data.success) {
                    select.innerHTML = ''; // Clear existing options
                    data.scenarios.forEach(fileName => {
                        const opt = document.createElement('option');
                        opt.value = fileName;
                        opt.textContent = fileName;
                        select.appendChild(opt);
                    });
                    
                    // Load first scenario
                    if (data.scenarios.length > 0) {
                        loadData(data.scenarios[0], true);
                    }
                } else {
                    apiLogger.error('Failed to load scenarios:', data.error);
                    alert('Fehler beim Laden der Szenarien. Bitte Server prüfen.');
                }
            } catch (error) {
                apiLogger.error('Network error loading scenarios:', error);
                alert('Netzwerkfehler: Server nicht erreichbar.');
            }
        }

        canvas.addEventListener('mousedown', (e) => { 
            if (editingNode) return;
            isDragging = true; 
            startX = e.clientX - offsetX; 
            startY = e.clientY - offsetY; 
        });

        canvas.addEventListener('dblclick', (e) => {
            if (!isEditable) return;
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldX = mouseX - offsetX;
            const worldY = mouseY - offsetY;
            
            let foundNode = null;
            nodes.forEach(node => {
                let hit = false;
                if (node.type === 'Event') { 
                    const dx = worldX - node.x, dy = worldY - node.y; 
                    const r = CONFIG.sizes.eventSize * 0.5;
                    if (dx*dx + dy*dy <= r * r) hit = true; 
                } else if (node.type === 'Task' || node.type === 'SubProcess') { 
                    const w = (node.type === 'Task' ? CONFIG.sizes.taskWidth : CONFIG.sizes.subProcessWidth) * 0.5;
                    const h = (node.type === 'Task' ? CONFIG.sizes.taskHeight : CONFIG.sizes.subProcessHeight) * 0.5;
                    if (worldX >= node.x - w && worldX <= node.x + w && worldY >= node.y - h && worldY <= node.y + h) hit = true; 
                } else if (node.type === 'Rule') { 
                    if (Math.abs(worldX - node.x) + Math.abs(worldY - node.y) <= CONFIG.sizes.ruleSize * 0.5) hit = true; 
                }
                if (hit) foundNode = node;
            });

            if (foundNode) {
                editingNode = foundNode;
                hoveredNode = null; 
                hoveredHandle = null;
                renderAll();
                
                const s = CONFIG.sizes;
                let overlayX, overlayY, overlayW, overlayH;
                
                if (foundNode.type === 'Task' || foundNode.type === 'SubProcess') {
                    overlayW = (foundNode.type === 'Task' ? s.taskWidth : s.subProcessWidth) - 10;
                    overlayH = (foundNode.type === 'Task' ? s.taskHeight : s.subProcessHeight) - 10;
                    overlayX = foundNode.x - overlayW * 0.5;
                    overlayY = foundNode.y - overlayH * 0.5;
                } else if (foundNode.type === 'Event') {
                    overlayW = s.eventSize * 1.4;
                    overlayH = 45; 
                    overlayX = foundNode.x - overlayW * 0.5;
                    overlayY = foundNode.y + s.eventSize * 0.5 + 10;
                } else if (foundNode.type === 'Rule') {
                    overlayW = s.ruleSize * 1.25;
                    overlayH = 45;
                    overlayX = foundNode.x - overlayW * 0.5;
                    overlayY = foundNode.y + s.ruleSize * 0.5 + 10;
                }
                
                nodeEditOverlay.value = foundNode.name;
                nodeEditOverlay.style.padding = OVERLAY_PADDING + 'px';
                nodeEditOverlay.style.left = (overlayX + offsetX + canvas.offsetLeft) + 'px';
                nodeEditOverlay.style.top = (overlayY + offsetY + canvas.offsetTop - OVERLAY_PADDING) + 'px';
                nodeEditOverlay.style.width = overlayW + 'px';
                nodeEditOverlay.style.height = overlayH + 'px';
                nodeEditOverlay.style.display = 'block';
                nodeEditOverlay.focus();
                
                nodeEditOverlay.selectionStart = nodeEditOverlay.selectionEnd = nodeEditOverlay.value.length;
                tooltip.style.display = 'none';
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect(); 
            lastMouseX = e.clientX - rect.left; 
            lastMouseY = e.clientY - rect.top;
            
            if (isDragging) { 
                offsetX = e.clientX - startX; 
                offsetY = e.clientY - startY; 
                renderAll(); 
                return; 
            }
            if (editingNode) return;

            updateHoverState(lastMouseX, lastMouseY);
        });
        window.addEventListener('mouseup', () => isDragging = false);
        window.addEventListener('resize', () => { updateCanvasSize(); centerGraph(); });

        // Initial Load from Server
        loadScenariosFromServer();
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
