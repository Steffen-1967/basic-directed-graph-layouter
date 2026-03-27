/**
 * @file app.ts
 * Main client-side entry point. Orchestrates UI, WebSocket communication, 
 * and user interactions with the process graph.
 */

import { CONFIG, ScenarioNode, TaskCollectionScenario } from './manifest.js';
import { Logger } from './logger.js';
import { HistoryManager, Action } from './historyManager.js';
import { UpdateNodePropertyAction, UpdateEdgePropertyAction, CompositeAction, DeleteNodeAction } from './actions.js';
import { 
    validateAndTransformGraph, 
    evolveSuccessors, 
    calculateFlowLayout,
    calculateBoxLayout,
    calculateTreeLayout,
    calculateGraphBoundings 
} from './layouterCalculate.js';
import { 
    render, 
    drawNodeHandles, 
    calculateArrowPath, 
    calculateTreePath,
    drawEdgeHandles,
    calculateNodeBoundingBox,
    calculateAnchorHandles,
    Edge
} from './renderer.js';
import { AppState, initialAppState, NodeHandle, stateEvents } from './state.js';

// DOM Elements
const canvas = document.getElementById('processCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const tooltip = document.getElementById('tooltip') as HTMLDivElement;
const select = document.getElementById('dataSelect') as HTMLSelectElement;
const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
const centerBtn = document.getElementById('centerBtn') as HTMLButtonElement;
const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
const redoBtn = document.getElementById('redoBtn') as HTMLButtonElement;
const toggleEditableBtn = document.getElementById('toggleEditableBtn') as HTMLButtonElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const nodeEditOverlay = document.getElementById('nodeEditOverlay') as HTMLTextAreaElement;
const nodeToolboxOverlay = document.getElementById('nodeToolboxOverlay') as HTMLDivElement;
const edgeToolboxOverlay = document.getElementById('edgeToolboxOverlay') as HTMLDivElement;
const colorPickerOverlay = document.getElementById('colorPickerOverlay') as HTMLDivElement;
const edgeWeightOverlay = document.getElementById('edgeWeightOverlay') as HTMLDivElement;
const dirtyIndicator = document.getElementById('dirtyIndicator') as HTMLSpanElement;
const padlockIcon = document.getElementById('padlockIcon') as HTMLSpanElement;
const padlockTooltip = document.getElementById('padlockTooltip') as HTMLSpanElement;
const lockModal = document.getElementById('lockModal') as HTMLDivElement;
const lockModalMessage = document.getElementById('lockModalMessage') as HTMLParagraphElement;
const lockModalOkBtn = document.getElementById('lockModalOkBtn') as HTMLButtonElement;
const recoveryModal = document.getElementById('recoveryModal') as HTMLDivElement;
const recoveryModalMessage = document.getElementById('recoveryModalMessage') as HTMLParagraphElement;
const recoveryModalYesBtn = document.getElementById('recoveryModalYesBtn') as HTMLButtonElement;
const recoveryModalNoBtn = document.getElementById('recoveryModalNoBtn') as HTMLButtonElement;
const leavePageModal = document.getElementById('leavePageModal') as HTMLDivElement;
const leavePageModalMessage = document.getElementById('leavePageModalMessage') as HTMLParagraphElement;
const leavePageModalYesBtn = document.getElementById('leavePageModalYesBtn') as HTMLButtonElement;
const leavePageModalNoBtn = document.getElementById('leavePageModalNoBtn') as HTMLButtonElement;
const scenarioNameDisplay = document.getElementById('scenarioNameDisplay') as HTMLSpanElement;

// Initialize Loggers
const wsLogger = new Logger('WS');
const lockLogger = new Logger('LOCK');
const apiLogger = new Logger('API');
const historyLogger = new Logger('HISTORY');

// Central Application State
const state: AppState = JSON.parse(JSON.stringify(initialAppState));

// Click Handling
let clickTimer: any = null;

/**
 * Calculates the distance from a point to a line segment.
 */
function distToSegment(p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}): number {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
}

function showToolbox(node: ScenarioNode, _mouseX: number, _mouseY: number): void {
    state.interaction.toolboxTargetNode = node;
    nodeToolboxOverlay.innerHTML = '';
    nodeToolboxOverlay.style.display = 'grid';
    
    const buttons = [
        { icon: 'pencil', title: 'Edit properties', action: handleEditProperties },
        { icon: 'sliders-horizontal', title: 'Change behavior', action: handleChangeNodeBehavior },
        { icon: 'palette', title: 'Set color', action: handleSetColor },
        { icon: 'trash-2', title: 'Delete', action: handleDeleteNode }
    ];
    
    buttons.forEach(btn => {
        const el = document.createElement('div');
        el.className = 'toolbox-btn';
        el.innerHTML = `<i data-lucide="${btn.icon}"></i>`;
        el.title = btn.title;
        el.onclick = (e) => {
            e.stopPropagation();
            btn.action(node);
            hideToolbox();
        };
        nodeToolboxOverlay.appendChild(el);
    });

    // @ts-ignore
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Position relative to node: Top-right corner
    const bbox = calculateNodeBoundingBox(node, CONFIG.sizes);
    const nodeRightX = node.x! + (bbox.width / 2);
    const nodeTopY = node.y! - (bbox.height / 2);
    
    const screenX = nodeRightX + state.view.offsetX + canvas.offsetLeft + 10; // 10px spacing
    const screenY = nodeTopY + state.view.offsetY + canvas.offsetTop;
    
    nodeToolboxOverlay.style.left = screenX + 'px';
    nodeToolboxOverlay.style.top = screenY + 'px';
}

function hideToolbox(): void {
    state.interaction.toolboxTargetNode = null;
    nodeToolboxOverlay.style.display = 'none';
}

function showEdgeToolbox(edge: Edge, x: number, y: number): void {
    state.interaction.selectedEdge = edge;
    edgeToolboxOverlay.innerHTML = '';
    edgeToolboxOverlay.style.display = 'grid';
    // Edge toolbox has only 1 column for its single button
    edgeToolboxOverlay.style.gridTemplateColumns = '1fr';
    
    const buttons = [
        { icon: 'sliders-horizontal', title: 'Change edge behavior', action: handleChangeEdgeBehavior }
    ];
    
    buttons.forEach(btn => {
        const el = document.createElement('div');
        el.className = 'toolbox-btn';
        el.innerHTML = `<i data-lucide="${btn.icon}"></i>`;
        el.title = btn.title;
        el.onclick = (e) => {
            e.stopPropagation();
            btn.action(edge);
            hideEdgeToolbox();
        };
        edgeToolboxOverlay.appendChild(el);
    });

    // @ts-ignore
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    edgeToolboxOverlay.style.left = (x + canvas.offsetLeft) + 'px';
    // Position above the mouse pointer: Subtract height + buffer
    const overlayHeight = edgeToolboxOverlay.offsetHeight || 40; // Fallback if not yet rendered
    edgeToolboxOverlay.style.top = (y + canvas.offsetTop - overlayHeight - 10) + 'px';
}

function hideEdgeToolbox(): void {
    edgeToolboxOverlay.style.display = 'none';
}

function handleEditProperties(node: ScenarioNode): void {
    historyLogger.log('[ACTION] Edit properties for node:', node.id);
}

function handleChangeNodeBehavior(node: ScenarioNode): void {
    historyLogger.log('[ACTION] Change behavior for node:', node.id);
}

function handleChangeEdgeBehavior(edge: Edge): void {
    historyLogger.log('[ACTION] Open weight picker for edge:', `${edge.fromId} → ${edge.toId}`);
    
    const startNode = state.nodes.find(n => n.id === edge.fromId);
    const endNode = state.nodes.find(n => n.id === edge.toId);
    if (!startNode || !endNode) return;

    // Get current weight from endNode's predecessors
    const currentRelation = endNode.predecessors?.find(p => p.id === edge.fromId);
    const currentWeight = currentRelation ? currentRelation.weight : 1;

    edgeWeightOverlay.innerHTML = '';
    edgeWeightOverlay.style.display = 'flex';
    
    const label = document.createElement('label');
    label.textContent = 'Kantengewicht:';
    edgeWeightOverlay.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '10';
    input.value = currentWeight.toString();
    edgeWeightOverlay.appendChild(input);

    const footer = document.createElement('div');
    footer.className = 'overlay-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'overlay-btn';
    cancelBtn.innerHTML = '<i data-lucide="x"></i> Abbruch';
    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        hideEdgeWeightOverlay();
    };
    footer.appendChild(cancelBtn);

    const okBtn = document.createElement('button');
    okBtn.className = 'overlay-btn primary';
    okBtn.innerHTML = '<i data-lucide="check"></i> OK';
    okBtn.onclick = (e) => {
        e.stopPropagation();
        const newVal = parseInt(input.value);
        if (!isNaN(newVal) && newVal >= 1 && newVal <= 10) {
            applyEdgeWeight(edge, newVal);
            hideEdgeWeightOverlay();
        }
    };
    footer.appendChild(okBtn);

    edgeWeightOverlay.appendChild(footer);

    // @ts-ignore
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const rect = edgeToolboxOverlay.getBoundingClientRect();
    edgeWeightOverlay.style.left = (rect.left) + 'px';
    edgeWeightOverlay.style.top = (rect.top) + 'px';
}

function hideEdgeWeightOverlay(): void {
    edgeWeightOverlay.style.display = 'none';
}

function applyEdgeWeight(edge: Edge, newWeight: number): void {
    const startNode = state.nodes.find(n => n.id === edge.fromId);
    const endNode = state.nodes.find(n => n.id === edge.toId);
    if (!startNode || !endNode) return;

    const oldWeight = endNode.predecessors?.find(p => p.id === edge.fromId)?.weight || 1;
    if (oldWeight === newWeight) return;

    const action = new UpdateEdgePropertyAction(state.nodes, edge.fromId, edge.toId, 'weight', newWeight, oldWeight);
    history.execute(action, state.scenario!);
    renderAll();
}

function handleSetColor(node: ScenarioNode): void {
    historyLogger.log('[ACTION] Open color picker for node:', node.id);
    
    colorPickerOverlay.innerHTML = '';
    colorPickerOverlay.style.display = 'grid';
    
    const colorSchemes = [
        { fill: null, stroke: null, label: 'Default' },
        { fill: '#e7f5ff', stroke: '#1971c2', label: 'Hellblau / Dunkelblau' },
        { fill: '#fdf2e9', stroke: '#af601a', label: 'Hellbraun / Dunkelbraun' },
        { fill: '#ebfbee', stroke: '#2b8a3e', label: 'Hellgrün / Dunkelgrün' },
        { fill: '#fff5f5', stroke: '#c92a2a', label: 'Hellrot / Dunkelrot' },
        { fill: '#f8f0fc', stroke: '#862e9c', label: 'Hellviolett / Dunkelviolett' },
        { fill: '#fff9db', stroke: '#e67700', label: 'Hellorange / Dunkelorange' },
        { fill: '#e3fafc', stroke: '#0b7285', label: 'Helltürkis / Dunkeltürkis' }
    ];
    
    colorSchemes.forEach(scheme => {
        const btn = document.createElement('div');
        btn.className = 'color-btn';
        btn.title = scheme.label;
        
        const sample = document.createElement('div');
        sample.className = 'color-sample';
        sample.style.backgroundColor = scheme.fill || '#ffffff';
        sample.style.borderColor = scheme.stroke || '#495057';
        
        btn.appendChild(sample);
        btn.onclick = (e) => {
            e.stopPropagation();
            applyColor(node, scheme.fill, scheme.stroke);
            hideColorPicker();
        };
        colorPickerOverlay.appendChild(btn);
    });
    
    const resetBtn = document.createElement('div');
    resetBtn.className = 'color-btn cancel-btn';
    resetBtn.innerHTML = '✕';
    resetBtn.title = 'Reset to default colors';
    resetBtn.onclick = (e) => {
        e.stopPropagation();
        applyColor(node, null, null);
        hideColorPicker();
    };
    colorPickerOverlay.appendChild(resetBtn);
    
    const rect = nodeToolboxOverlay.getBoundingClientRect();
    colorPickerOverlay.style.left = (rect.left) + 'px';
    colorPickerOverlay.style.top = (rect.top) + 'px';
}

function hideColorPicker(): void {
    colorPickerOverlay.style.display = 'none';
}

function applyColor(node: ScenarioNode, fillColor: string | null, strokeColor: string | null): void {
    historyLogger.log('[ACTION] Applying new colors for node:', node.id, {fill: fillColor, stroke: strokeColor});
    const actions: Action[] = [
        new UpdateNodePropertyAction(state.nodes, node.id, 'overrideFillColor', fillColor, node.overrideFillColor),
        new UpdateNodePropertyAction(state.nodes, node.id, 'overrideStrokeColor', strokeColor, node.overrideStrokeColor)
    ];
    const composite = new CompositeAction(actions as any);
    history.execute(composite, state.scenario!);
    renderAll();
}

function handleDeleteNode(node: ScenarioNode): void {
    historyLogger.log('[ACTION] Delete node:', node.id);
    
    // Clear selection and hover state if the node to be deleted is currently selected/hovered
    if (state.interaction.selectedNode?.id === node.id) {
        state.interaction.selectedNode = null;
        stateEvents.emit({ type: 'NODE_SELECTED', nodeId: null });
    }
    if (state.interaction.hoveredNode?.id === node.id) {
        state.interaction.hoveredNode = null;
        stateEvents.emit({ type: 'HOVER_CHANGED', nodeId: null, edgeFromId: null, edgeToId: null });
    }

    const action = new DeleteNodeAction(state.nodes, node.id);
    history.execute(action, state.scenario!);
    renderAll();
}

window.addEventListener('mousedown', (e) => {
    if (nodeToolboxOverlay.style.display === 'grid' && !nodeToolboxOverlay.contains(e.target as Node)) {
        hideToolbox();
    }
    if (edgeToolboxOverlay.style.display === 'grid' && !edgeToolboxOverlay.contains(e.target as Node)) {
        hideEdgeToolbox();
    }
    if (colorPickerOverlay.style.display === 'grid' && !colorPickerOverlay.contains(e.target as Node)) {
        hideColorPicker();
    }
    if (edgeWeightOverlay.style.display === 'flex' && !edgeWeightOverlay.contains(e.target as Node)) {
        hideEdgeWeightOverlay();
    }
});

const history = new HistoryManager({ persistenceKey: 'mylife_snapshot_' + select.value });

function connectWebSocket(): void {
    state.network.ws = new WebSocket(`ws://${window.location.host}`);
    state.network.ws.onopen = () => wsLogger.log('Connected to server');
    state.network.ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleWebSocketMessage(msg);
        } catch (e) {
            wsLogger.error('Error parsing message:', e);
        }
    };
    state.network.ws.onerror = (error) => wsLogger.error('WebSocket error:', error);
    state.network.ws.onclose = () => {
        wsLogger.log('Connection closed. Reconnecting in 3 seconds...');
        setTimeout(connectWebSocket, 3000);
    };
}

function handleWebSocketMessage(msg: any): void {
    switch (msg.type) {
        case 'connected':
            state.network.clientId = msg.clientId;
            if (select.value) requestLockStatus(select.value);
            break;
        case 'lock_response':
            if (msg.success) {
                state.interaction.isEditable = true;
                state.network.isLockedByOther = false;
                state.network.currentScenarioLock = { scenario: msg.scenario, holder: state.network.clientId! };
            } else {
                state.interaction.isEditable = false;
                state.network.isLockedByOther = true;
                state.network.currentScenarioLock = { scenario: msg.scenario, holder: msg.holder };
                showLockModal('Dieses Szenario wird von einem anderen Tab bearbeitet.');
            }
            updateEditButton();
            updatePadlockIcon();
            break;
        case 'lock_acquired':
            if (msg.holder !== state.network.clientId && msg.scenario === select.value) {
                state.interaction.isEditable = false;
                state.network.isLockedByOther = true;
                state.network.currentScenarioLock = { scenario: msg.scenario, holder: msg.holder };
                showLockModal('Ein anderer Tab hat die Bearbeitung übernommen.');
                updateEditButton();
                updatePadlockIcon();
            }
            break;
        case 'lock_released':
            if (msg.scenario === select.value) {
                state.network.isLockedByOther = false;
                state.network.currentScenarioLock = null;
                updateEditButton();
                updatePadlockIcon();
            }
            break;
        case 'lock_status':
            if (msg.locked && msg.holder !== state.network.clientId) {
                state.network.isLockedByOther = true;
                state.network.currentScenarioLock = { scenario: msg.scenario, holder: msg.holder };
                showLockModal('Dieses Szenario wird bereits bearbeitet.');
            } else {
                state.network.isLockedByOther = false;
                state.network.currentScenarioLock = null;
            }
            updateEditButton();
            updatePadlockIcon();
            break;
    }
}

function requestLockStatus(scenarioName: string): void {
    if (state.network.ws && state.network.ws.readyState === WebSocket.OPEN) state.network.ws.send(JSON.stringify({ type: 'lock_status', scenario: scenarioName }));
}

function requestLock(scenarioName: string): void {
    if (state.network.ws && state.network.ws.readyState === WebSocket.OPEN) state.network.ws.send(JSON.stringify({ type: 'lock_request', scenario: scenarioName }));
}

function releaseLock(scenarioName: string): void {
    if (state.network.ws && state.network.ws.readyState === WebSocket.OPEN) state.network.ws.send(JSON.stringify({ type: 'lock_release', scenario: scenarioName }));
}

function showLockModal(message: string): void {
    lockModalMessage.textContent = message;
    lockModal.style.display = 'flex';
}

function hideLockModal(): void {
    lockModal.style.display = 'none';
}

lockModalOkBtn.addEventListener('click', hideLockModal);

function showRecoveryModal(message: string): Promise<boolean> {
    return new Promise((resolve) => {
        recoveryModalMessage.innerHTML = message.replace(/\\n/g, '<br>');
        recoveryModal.style.display = 'flex';
        const handleYes = () => { cleanup(); resolve(true); };
        const handleNo = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            recoveryModalYesBtn.removeEventListener('click', handleYes);
            recoveryModalNoBtn.removeEventListener('click', handleNo);
            recoveryModal.style.display = 'none';
        };
        recoveryModalYesBtn.addEventListener('click', handleYes);
        recoveryModalNoBtn.addEventListener('click', handleNo);
    });
}

function showLeavePageModal(message: string): Promise<boolean> {
    return new Promise((resolve) => {
        leavePageModalMessage.innerHTML = message.replace(/\\n/g, '<br>');
        leavePageModal.style.display = 'flex';
        const handleYes = () => { cleanup(); resolve(true); };
        const handleNo = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            leavePageModalYesBtn.removeEventListener('click', handleYes);
            leavePageModalNoBtn.removeEventListener('click', handleNo);
            leavePageModal.style.display = 'none';
        };
        leavePageModalYesBtn.addEventListener('click', handleYes);
        leavePageModalNoBtn.addEventListener('click', handleNo);
    });
}

function updatePadlockIcon(): void {
    const iconContainer = padlockIcon;
    if (state.network.isLockedByOther) {
        iconContainer.innerHTML = '<i data-lucide="lock"></i>';
    } else if (state.interaction.isEditable) {
        iconContainer.innerHTML = '<i data-lucide="lock-open"></i>';
    } else {
        iconContainer.innerHTML = '<i data-lucide="lock"></i>';
    }
    // @ts-ignore
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateEditButton(): void {
    document.body.classList.remove('is-editable', 'is-locked', 'is-readonly');

    if (state.network.isLockedByOther) {
        toggleEditableBtn.disabled = true;
        toggleEditableBtn.innerHTML = '<i data-lucide="lock"></i> locked';
        document.body.classList.add('is-locked');
        saveBtn.style.display = 'none';
    } else if (state.interaction.isEditable) {
        toggleEditableBtn.disabled = false;
        toggleEditableBtn.innerHTML = '<i data-lucide="edit-3"></i> yes';
        document.body.classList.add('is-editable');
        saveBtn.style.display = 'inline-block';
    } else {
        toggleEditableBtn.disabled = false;
        toggleEditableBtn.innerHTML = '<i data-lucide="edit-3"></i> no';
        document.body.classList.add('is-readonly');
        saveBtn.style.display = 'none';
    }
    // @ts-ignore
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function saveData(): Promise<void> {
    if (!state.scenario || !state.interaction.isEditable) return;
    
    try {
        const response = await fetch('/api/scenario/' + select.value, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.scenario)
        });
        
        const result = await response.json();
        if (result.success) {
            history.markSaved();
            updateHistoryButtons();
            apiLogger.log('Scenario saved successfully');
        } else {
            apiLogger.error('Failed to save scenario');
        }
    } catch (error) {
        apiLogger.error('Error saving scenario:', error);
    }
}

saveBtn.addEventListener('click', saveData);

// Subscribe to state changes for debugging/logging
stateEvents.subscribe((event) => {
    switch (event.type) {
        case 'NODE_SELECTED':
            historyLogger.log('[EVENT] Node selected:', event.nodeId);
            break;
        case 'EDIT_MODE_CHANGED':
            historyLogger.log('[EVENT] Edit mode changed:', event.isEditable);
            break;
        case 'DIRTY_STATE_CHANGED':
            historyLogger.log('[EVENT] Dirty state changed:', event.isDirty);
            break;
        case 'SCENARIO_LOADED':
            historyLogger.log('[EVENT] Scenario loaded:', event.scenarioName);
            break;
        case 'HOVER_CHANGED':
            if (event.nodeId) {
                historyLogger.log('[EVENT] Hover node:', event.nodeId.substring(0, 8));
            } else if (event.edgeFromId && event.edgeToId) {
                historyLogger.log('[EVENT] Hover edge:', `${event.edgeFromId.substring(0, 8)} → ${event.edgeToId.substring(0, 8)}`);
            } else {
                historyLogger.log('[EVENT] Hover cleared');
            }
            break;
    }
});

connectWebSocket();

function updateCanvasSize(): void {
    if (state.interaction.isEditable) {
        const container = document.getElementById('canvasContainer') as HTMLDivElement;
        canvas.width = container.clientWidth - 20;
        canvas.height = container.clientHeight - 20;
    } else {
        if (state.nodes.length === 0) return;
        const boundings = calculateGraphBoundings(state.nodes, CONFIG.sizes);
        canvas.width = boundings.width + 320;
        canvas.height = boundings.height + 200;
    }
}

function centerGraph(): void {
    if (state.nodes.length === 0) return;
    const boundings = calculateGraphBoundings(state.nodes, CONFIG.sizes);
    state.view.offsetX = (canvas.width - boundings.width) * 0.5 - boundings.minX;
    state.view.offsetY = (canvas.height - boundings.height) * 0.5 - boundings.minY;
    renderAll();
}

function renderAll(): void {
    const layoutType = state.scenario?.layoutType || 'flow';
    const switchLevel = state.scenario?.layoutPreferences?.switchToListLevel ?? 99;
    
    render(ctx, canvas, state.view.offsetX, state.view.offsetY, state.nodes, CONFIG.sizes, CONFIG.colors, CONFIG.colW, CONFIG.rowH, state.interaction.isEditable, state.interaction.hoveredEdge, state.interaction.selectedEdge, state.interaction.hoveredNode, state.interaction.selectedNode, layoutType, switchLevel);
    
    if (state.interaction.isEditable) {
        if (state.interaction.selectedNode) {
            drawNodeHandles(ctx, state.interaction.selectedNode, CONFIG.sizes, CONFIG.colors, state.interaction.hoveredNodeHandle);
        } else if (state.interaction.selectedEdge) {
            const fromNode = state.nodes.find(n => n.id === state.interaction.selectedEdge!.fromId);
            const toNode = state.nodes.find(n => n.id === state.interaction.selectedEdge!.toId);
            if (fromNode && toNode) {
                const path = (layoutType === 'tree')
                    ? calculateTreePath(fromNode, toNode, CONFIG.sizes, switchLevel)
                    : calculateArrowPath(fromNode, toNode, CONFIG.sizes, CONFIG.colW, CONFIG.rowH);
                drawEdgeHandles(ctx, path, CONFIG.colors, state.interaction.hoveredEdgeHandle);
            }
        }
    }
    updateHistoryButtons();
}

function refreshGraph(): void {
    if (!state.scenario) return;
    
    evolveSuccessors(state.nodes);
    
    if (state.scenario.layoutType === 'box') {
        const maxColumns = state.scenario.layoutPreferences?.maxColumns || 4;
        calculateBoxLayout(state.nodes, CONFIG.colW, CONFIG.rowH, maxColumns);
    } else if (state.scenario.layoutType === 'tree') {
        const switchLevel = state.scenario.layoutPreferences?.switchToListLevel ?? 99;
        calculateTreeLayout(state.nodes, CONFIG.colW, CONFIG.rowH, switchLevel);
    } else {
        calculateFlowLayout(state.nodes, CONFIG.colW, CONFIG.rowH);
    }
    
    renderAll();
}

(window as any).refreshGraph = refreshGraph;

function setDirty(value: boolean): void {
    state.isDirty = value;
    dirtyIndicator.style.display = value ? 'inline' : 'none';
    saveBtn.style.display = (state.interaction.isEditable && value) ? 'inline-block' : 'none';
}

function updateHistoryButtons(): void {
    undoBtn.disabled = history.undoStack.length === 0;
    redoBtn.disabled = history.redoStack.length === 0;
    setDirty(history.isDirty());
}

function updateHoverState(mouseX: number, mouseY: number): void {
    const worldX = mouseX - state.view.offsetX; 
    const worldY = mouseY - state.view.offsetY; 
    let foundNode: ScenarioNode | null = null;
    let foundEdge: Edge | null = null;
    let foundEdgeAnchor: number | null = null;
    let foundHandle: NodeHandle | null = null;
    const hoverExpansion = 10; 
    
    if (state.interaction.isEditable) {
        const layoutType = state.scenario?.layoutType || 'flow';
        const switchLevel = state.scenario?.layoutPreferences?.switchToListLevel ?? 99;

        for (const node of state.nodes) {
            if (node.predecessors) {
                for (const predEntry of node.predecessors) {
                    const predId = predEntry.id;
                    const predNode = state.nodes.find(n => n.id === predId);
                    if (predNode) {
                        const path = (layoutType === 'tree')
                            ? calculateTreePath(predNode, node, CONFIG.sizes, switchLevel)
                            : calculateArrowPath(predNode, node, CONFIG.sizes, CONFIG.colW, CONFIG.rowH);
                        for (let idx = 0; idx < path.length; idx++) {
                            const pt = path[idx];
                            if (Math.sqrt((worldX - pt.x) ** 2 + (worldY - pt.y) ** 2) <= 8) {
                                foundEdge = { fromId: predId, toId: node.id };
                                foundEdgeAnchor = idx;
                                break;
                            }
                        }
                        if (foundEdgeAnchor !== null) break;

                        for (let i = 0; i < path.length - 1; i++) {
                            if (distToSegment({ x: worldX, y: worldY }, path[i], path[i+1]) <= 5) {
                                foundEdge = { fromId: predId, toId: node.id };
                                break;
                            }
                        }
                    }
                    if (foundEdge) break;
                }
            }
            if (foundEdge) break;
        }

        if (foundEdgeAnchor === null) {
            for (const node of state.nodes) {
                let hit = false;
                if (node.type === 'Event') { 
                    const dx = worldX - node.x!, dy = worldY - node.y!; 
                    const r = CONFIG.sizes.eventSize * 0.5 + hoverExpansion;
                    if (dx*dx + dy*dy <= r * r) hit = true; 
                } else if (node.type === 'Task' || node.type === 'SubProcess') { 
                    const w = (node.type === 'Task' ? CONFIG.sizes.taskWidth : CONFIG.sizes.subProcessWidth) * 0.5 + hoverExpansion;
                    const h = (node.type === 'Task' ? CONFIG.sizes.taskHeight : CONFIG.sizes.subProcessHeight) * 0.5 + hoverExpansion;
                    if (worldX >= node.x! - w && worldX <= node.x! + w && worldY >= node.y! - h && worldY <= node.y! + h) hit = true; 
                } else if (node.type === 'Rule') { 
                    if (Math.abs(worldX - node.x!) + Math.abs(worldY - node.y!) <= CONFIG.sizes.ruleSize * 0.5 + hoverExpansion) hit = true; 
                }
                if (hit) foundNode = node;
            }

            if (foundNode) {
                const bbox = calculateNodeBoundingBox(foundNode, CONFIG.sizes);
                const anchors = calculateAnchorHandles(bbox, foundNode.type, foundNode.x!, foundNode.y!, CONFIG.sizes);
                for (const [key, anchor] of Object.entries(anchors)) {
                    if (Math.sqrt((worldX - anchor.x) ** 2 + (worldY - anchor.y) ** 2) <= 8) {
                        // Parse key like "top-1" into NodeHandle object
                        const [side, indexStr] = key.split('-');
                        foundHandle = { 
                            side: side as 'top' | 'bottom' | 'left' | 'right', 
                            index: parseInt(indexStr) as 1 | 2 | 3 
                        };
                        break;
                    }
                }
                foundEdge = null;
            }
        }

        if (foundNode !== state.interaction.hoveredNode || foundHandle !== state.interaction.hoveredNodeHandle || 
            foundEdge?.fromId !== state.interaction.hoveredEdge?.fromId || foundEdge?.toId !== state.interaction.hoveredEdge?.toId ||
            foundEdgeAnchor !== state.interaction.hoveredEdgeHandle) {
            
            state.interaction.hoveredNode = foundNode; 
            state.interaction.hoveredNodeHandle = foundHandle;
            state.interaction.hoveredEdge = foundEdge;
            state.interaction.hoveredEdgeHandle = foundEdgeAnchor;
            
            // Emit hover event
            stateEvents.emit({
                type: 'HOVER_CHANGED',
                nodeId: foundNode?.id || null,
                edgeFromId: foundEdge?.fromId || null,
                edgeToId: foundEdge?.toId || null
            });
            
            renderAll();
        }
        canvas.style.cursor = (foundNode || foundEdge) ? 'default' : 'move';
    } else {
        for (const node of state.nodes) {
            let hit = false;
            if (node.type === 'Event') { 
                const dx = worldX - node.x!, dy = worldY - node.y!; 
                const r = CONFIG.sizes.eventSize * 0.5;
                if (dx*dx + dy*dy <= r * r) hit = true; 
            } else if (node.type === 'Task' || node.type === 'SubProcess') { 
                const w = (node.type === 'Task' ? CONFIG.sizes.taskWidth : CONFIG.sizes.subProcessWidth) * 0.5;
                const h = (node.type === 'Task' ? CONFIG.sizes.taskHeight : CONFIG.sizes.subProcessHeight) * 0.5;
                if (worldX >= node.x! - w && worldX <= node.x! + w && worldY >= node.y! - h && worldY <= node.y! + h) hit = true; 
            } else if (node.type === 'Rule') { 
                if (Math.abs(worldX - node.x!) + Math.abs(worldY - node.y!) <= CONFIG.sizes.ruleSize * 0.5) hit = true; 
            }
            if (hit) foundNode = node;
        }

        if (foundNode) {
            const shortId = foundNode.id.substring(0, 8);
            tooltip.style.left = (state.interaction.lastMouseX + 15 + canvas.offsetLeft) + 'px'; 
            tooltip.style.top = (state.interaction.lastMouseY + 15 + canvas.offsetTop) + 'px';
            tooltip.innerHTML = `<div><b>ID:</b> ${shortId} | <b>Type:</b> ${foundNode.type}</div><div>${foundNode.name}</div>`;
            tooltip.style.display = 'block'; canvas.style.cursor = 'default';
        } else {
            tooltip.style.display = 'none'; canvas.style.cursor = 'move';
        }
        
        if (foundNode !== state.interaction.hoveredNode) {
            state.interaction.hoveredNode = foundNode;
            
            // Emit hover event
            stateEvents.emit({
                type: 'HOVER_CHANGED',
                nodeId: foundNode?.id || null,
                edgeFromId: null,
                edgeToId: null
            });
            
            renderAll();
        }
    }
}

window.addEventListener('beforeunload', (e) => { if (history.isDirty()) { e.preventDefault(); e.returnValue = ''; } });

function saveInPlaceEditOnName(): void {
    if (state.interaction.editingNode) {
        const newName = nodeEditOverlay.value.trim();
        if (newName !== state.interaction.editingNode.name) {
            history.execute(new UpdateNodePropertyAction(state.nodes, state.interaction.editingNode.id, 'name', newName, state.interaction.editingNode.name), state.scenario!);
        }
        state.interaction.editingNode = null;
        nodeEditOverlay.style.display = 'none';
        updateHoverState(state.interaction.lastMouseX, state.interaction.lastMouseY);
        renderAll();
    }
}

function startNodeNameEdit(node: ScenarioNode): void {
    state.interaction.editingNode = node;
    nodeEditOverlay.value = state.interaction.editingNode.name;
    nodeEditOverlay.style.display = 'block';

    const sizes = CONFIG.sizes;
    let w, h, targetX, targetY, isCentered;

    if (state.interaction.editingNode.type === 'Task' || state.interaction.editingNode.type === 'SubProcess') {
        w = (state.interaction.editingNode.type === 'Task' ? sizes.taskWidth : sizes.subProcessWidth) - 10;
        h = (state.interaction.editingNode.type === 'Task' ? sizes.taskHeight : sizes.subProcessHeight) - 10;
        targetX = state.interaction.editingNode.x!;
        targetY = state.interaction.editingNode.y!;
        isCentered = true;
    } else if (state.interaction.editingNode.type === 'Event') {
        w = sizes.eventSize * 1.5;
        h = 40;
        targetX = state.interaction.editingNode.x!;
        targetY = state.interaction.editingNode.y! + sizes.eventSize * 0.5 + 10;
        isCentered = false;
    } else if (state.interaction.editingNode.type === 'Rule') {
        w = sizes.ruleSize * 1.5;
        h = 40;
        targetX = state.interaction.editingNode.x!;
        targetY = state.interaction.editingNode.y! + sizes.ruleSize * 0.5 + 10;
        isCentered = false;
    } else {
        w = 100; h = 40; targetX = 0; targetY = 0; isCentered = true;
    }

    nodeEditOverlay.style.width = w + 'px';
    nodeEditOverlay.style.height = h + 'px';
    nodeEditOverlay.style.left = (targetX + state.view.offsetX + canvas.offsetLeft - w / 2) + 'px';
    nodeEditOverlay.style.top = (targetY + state.view.offsetY + canvas.offsetTop - (isCentered ? h / 2 : 0)) + 'px';

    nodeEditOverlay.focus();
}

nodeEditOverlay.addEventListener('blur', saveInPlaceEditOnName);
nodeEditOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInPlaceEditOnName(); }
    else if (e.key === 'Escape') { state.interaction.editingNode = null; nodeEditOverlay.style.display = 'none'; renderAll(); }
});

async function loadData(fileName: string): Promise<void> {
    if (history.isDirty()) {
        const proceed = await showLeavePageModal(`Es gibt ungespeicherte Änderungen.\\nMöchten Sie diese verwerfen und das neue Szenario laden?`);
        if (!proceed) return;
        history.clear(); // Explicitly clear old changes if user discards them
    }

    if (state.network.currentScenarioLock) releaseLock(state.network.currentScenarioLock.scenario);
    state.interaction.isEditable = false; 
    updateEditButton();
    history.persistenceKey = 'mylife_snapshot_' + fileName;
    
    const recoveredData = history.recover();
    if (recoveredData) {
        const timeStr = new Date(recoveredData.timestamp).toLocaleString();
        const useRecovered = await showRecoveryModal(`Für dieses Szenario wurden ungespeicherte Änderungen vom ${timeStr} gefunden.\\nMöchten Sie diese wiederherstellen?`);
        if (useRecovered) {
            state.scenario = {
                nodes: recoveredData.nodes,
                scenarioName: recoveredData.scenarioName,
                layoutType: recoveredData.layoutType,
                layoutPreferences: recoveredData.layoutPreferences
            };
            state.nodes = state.scenario.nodes;
            scenarioNameDisplay.textContent = state.scenario.scenarioName;
            refreshGraph();
            updateCanvasSize(); 
            centerGraph(); 
            requestLockStatus(fileName);
            return;
        } else {
            history.clear(); // User declined recovery, clear the entry
        }
    }

    try {
        const response = await fetch('/api/scenario/' + fileName);
        const result = await response.json();
        if (result.success) {
            state.scenario = validateAndTransformGraph(result.data);
            state.nodes = state.scenario.nodes;
            scenarioNameDisplay.textContent = state.scenario.scenarioName;
            refreshGraph();
            history.clear();
        }
    } catch (error) { apiLogger.error('Error loading scenario'); }
    
    updateCanvasSize(); centerGraph(); requestLockStatus(fileName);
}

loadBtn.addEventListener('click', () => loadData(select.value));
undoBtn.addEventListener('click', () => { if (state.scenario) { history.undo(state.scenario); renderAll(); } });
redoBtn.addEventListener('click', () => { if (state.scenario) { history.redo(state.scenario); renderAll(); } });

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { if (e.shiftKey) { if (state.scenario) history.redo(state.scenario); } else { if (state.scenario) history.undo(state.scenario); } renderAll(); }
        else if (e.key === 'y') { if (state.scenario) history.redo(state.scenario); renderAll(); }
    }
});

centerBtn.addEventListener('click', centerGraph);
toggleEditableBtn.addEventListener('click', () => {
    if (state.network.isLockedByOther) return;
    if (!state.interaction.isEditable) requestLock(select.value);
    else { releaseLock(select.value); state.interaction.isEditable = false; updateEditButton(); updatePadlockIcon(); }
});

async function loadScenariosFromServer(): Promise<void> {
    const response = await fetch('/api/scenarios');
    const data = await response.json();
    if (data.success) {
        select.innerHTML = '';
        data.scenarios.forEach((s: string) => { const o = document.createElement('option'); o.value = s; o.textContent = s; select.appendChild(o); });
        if (data.scenarios.length > 0) loadData(data.scenarios[0]);
    }
}

canvas.addEventListener('mousedown', (e) => {
    if (state.interaction.editingNode) return;
    
    if (state.interaction.isEditable) {
        if (state.interaction.hoveredNode) {
            state.interaction.selectedNode = state.interaction.hoveredNode;
            state.interaction.selectedEdge = null;
            
            // Emit event: Node selected
            stateEvents.emit({ 
                type: 'NODE_SELECTED', 
                nodeId: state.interaction.hoveredNode.id 
            });
        } else if (state.interaction.hoveredEdge) {
            state.interaction.selectedEdge = state.interaction.hoveredEdge;
            state.interaction.selectedNode = null;
            
            // Emit event: Edge selected
            stateEvents.emit({ 
                type: 'EDGE_SELECTED', 
                fromId: state.interaction.hoveredEdge.fromId, 
                toId: state.interaction.hoveredEdge.toId 
            });
        } else {
            state.interaction.selectedNode = null;
            state.interaction.selectedEdge = null;
            
            // Emit event: Deselection
            stateEvents.emit({ type: 'NODE_SELECTED', nodeId: null });
            stateEvents.emit({ type: 'EDGE_SELECTED', fromId: null, toId: null });
        }
        renderAll();
    }

    state.interaction.isDragging = true; state.interaction.startX = e.clientX - state.view.offsetX; state.interaction.startY = e.clientY - state.view.offsetY;
});

canvas.addEventListener('click', (e) => {
    if (!state.interaction.isEditable) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (clickTimer !== null) {
        clearTimeout(clickTimer);
        clickTimer = null;
        if (state.interaction.hoveredNode) {
            startNodeNameEdit(state.interaction.hoveredNode);
        }
    } else {
        clickTimer = setTimeout(() => {
            if (state.interaction.hoveredNode) {
                showToolbox(state.interaction.hoveredNode, mouseX, mouseY);
            } else if (state.interaction.hoveredEdge) {
                showEdgeToolbox(state.interaction.hoveredEdge, mouseX, mouseY);
            }
            clickTimer = null;
        }, CONFIG.interaction.doubleClickDelay);
    }
});

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.interaction.lastMouseX = e.clientX - rect.left; state.interaction.lastMouseY = e.clientY - rect.top;
    if (state.interaction.isDragging) { state.view.offsetX = e.clientX - state.interaction.startX; state.view.offsetY = e.clientY - state.interaction.startY; renderAll(); }
    else updateHoverState(state.interaction.lastMouseX, state.interaction.lastMouseY);
});
window.addEventListener('mouseup', () => state.interaction.isDragging = false);
window.addEventListener('resize', () => { updateCanvasSize(); centerGraph(); });

loadScenariosFromServer();
