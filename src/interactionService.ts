/**
 * @file interactionService.ts
 * Manages canvas interactions, hit-testing, and mouse events for SVG.
 */

import { AppState, NodeHandle, stateEvents, InteractionState } from './state';
import { RENDER_CONFIG, GraphNode, getLangValue, LayoutType } from './manifest';
import { LayoutEngine } from './layoutEngine';
import { LoggerProxy } from './loggerProxy';
import {
    calculateNodeBoundingBox,
    calculateAnchorHandles,
    Edge
} from './renderer';
import { MarkdownEngine } from './markdown';

export interface InteractionCallbacks {
    renderAll: () => void;
    showToolbox: (node: GraphNode, x: number, y: number) => void;
    showEdgeToolbox: (edge: Edge, x: number, y: number) => void;
    startNodeNameEdit: (node: GraphNode) => void;
}

export class InteractionService {
    private clickTimer: any = null;

    constructor(
        private state: AppState,
        private canvas: HTMLElement,
        private tooltip: HTMLDivElement,
        private callbacks: InteractionCallbacks
    ) {
        this.initListeners();
    }

    private initListeners(): void {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e as MouseEvent));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e as MouseEvent));
        window.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseover', () => this.updateCursor());
    }

    public centerGraph(canvasWidth: number, canvasHeight: number): void {
        const networkLogger = new LoggerProxy('NETWORK');
        const nodesToMeasure = this.state.interaction.nodesToLayout || this.state.nodes;
        if (!nodesToMeasure || nodesToMeasure.length === 0) {
            networkLogger.warn('[CENTER] No nodes to measure');
            return;
        }

        const layoutType = this.state.interaction.activeLayoutType || this.state.envelope?.layoutType || LayoutType.Flow;
        const bbox = LayoutEngine.calculateGraphBoundings(nodesToMeasure, layoutType);
        const zoom = this.state.view.zoom || 1;

        if (canvasWidth === 0 || canvasHeight === 0) {
            networkLogger.warn('[CENTER] Canvas dimensions are zero, skipping centering.');
            return;
        }

        const graphCenterX = bbox.minX + bbox.width * 0.5;
        const graphCenterY = bbox.minY + bbox.height * 0.5;

        // Calculate offset to place graph center at canvas center
        this.state.view.offsetX = (canvasWidth * 0.5) - (graphCenterX * zoom);
        this.state.view.offsetY = (canvasHeight * 0.5) - (graphCenterY * zoom);
        
        networkLogger.log(`[CENTER] Layout: ${layoutType}, BBox: ${JSON.stringify(bbox)}, Canvas: ${canvasWidth}x${canvasHeight}, Zoom: ${zoom}, Final Offset: x=${this.state.view.offsetX}, y=${this.state.view.offsetY}`);
    }

    public resetSelection(): void {
        this.state.interaction.state = InteractionState.Idle;
        this.state.interaction.selectedNode = null;
        this.state.interaction.selectedEdge = null;
        this.state.interaction.hoveredNode = null;
        this.state.interaction.hoveredEdge = null;
        this.state.interaction.hoveredNodeHandle = null;
        this.state.interaction.hoveredEdgeHandle = null;
        this.state.interaction.toolboxTargetNode = null;
    }

    private handleMouseDown(e: MouseEvent): void {
        if (this.state.interaction.editingNode) {
            this.state.interaction.state = InteractionState.Editing;
            return;
        }
        
        const target = e.target as HTMLElement;
        if (target.closest('.svg-node') || target.closest('.svg-edge')) return;

        this.state.interaction.state = InteractionState.DraggingCanvas;
        this.state.interaction.startX = e.clientX;
        this.state.interaction.startY = e.clientY;
        this.state.interaction.startOffsetX = this.state.view.offsetX;
        this.state.interaction.startOffsetY = this.state.view.offsetY;

        this.state.interaction.selectedNode = null;
        this.state.interaction.selectedEdge = null;
        stateEvents.emit({ type: 'NODE_SELECTED', nodeId: null });
        stateEvents.emit({ type: 'EDGE_SELECTED', fromId: null, toId: null });
        this.callbacks.renderAll();
    }

    private handleMouseUp(): void {
        console.log(`[INTERACTION] handleMouseUp. Previous state: ${this.state.interaction.state}`);
        this.state.interaction.state = InteractionState.Idle;
        this.callbacks.renderAll(); // Ensure UI updates immediately after drag/click
    }

    private handleMouseMove(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        this.state.interaction.lastMouseX = e.clientX - rect.left; 
        this.state.interaction.lastMouseY = e.clientY - rect.top;

        if (this.state.interaction.state === InteractionState.DraggingCanvas) {
            const dx = e.clientX - this.state.interaction.startX;
            const dy = e.clientY - this.state.interaction.startY;
            this.state.view.offsetX = (this.state.interaction.startOffsetX || 0) + dx;
            this.state.view.offsetY = (this.state.interaction.startOffsetY || 0) + dy;
            this.callbacks.renderAll();
        }
        
        this.updateCursor();
        this.updateTooltip();
    }

    private updateCursor(): void {
        if (this.state.interaction.state === InteractionState.DraggingCanvas) {
            this.canvas.style.cursor = 'grabbing';
        } else {
            const isHovering = this.state.interaction.hoveredNode || this.state.interaction.hoveredEdge;
            this.canvas.style.cursor = isHovering ? 'pointer' : 'default';
        }
    }

    private updateTooltip(): void {
        if (!this.state.interaction.isEditable && this.state.interaction.hoveredNode) {
            const node = this.state.interaction.hoveredNode;
            const shortId = node.id.substring(0, 8);
            const desc = getLangValue(node.description);
            const descHtml = MarkdownEngine.render(desc);
            
            const rect = this.canvas.getBoundingClientRect();
            this.tooltip.style.left = (this.state.interaction.lastMouseX + 15 + rect.left) + 'px'; 
            this.tooltip.style.top = (this.state.interaction.lastMouseY + 15 + rect.top) + 'px';
            this.tooltip.innerHTML = `<div><b>ID:</b> ${shortId} | <b>Type:</b> ${node.type}</div><div style="font-weight: bold; margin-bottom: 5px;">${getLangValue(node.name)}</div><div class="tooltip-description">${descHtml}</div>`;
            this.tooltip.style.display = 'block';
        } else {
            this.tooltip.style.display = 'none';
        }
    }

    public handleNodeClick(node: GraphNode, x: number, y: number): void {
        console.log(`[INTERACTION] handleNodeClick: node=${node.id}, pos=(${x}, ${y})`);
        
        // Double-click detection
        if (this.clickTimer !== null) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
            
            if (this.state.interaction.isEditable) {
                this.state.interaction.state = InteractionState.Editing;
                this.callbacks.startNodeNameEdit(node);
            }
        } else {
            this.clickTimer = setTimeout(() => {
                if (this.state.interaction.isEditable) {
                    // TRICK: Use node coordinates transformed to screen space
                    const zoom = this.state.view.zoom || 1;
                    const screenX = (node._x! * zoom) + this.state.view.offsetX;
                    const screenY = (node._y! * zoom) + this.state.view.offsetY;
                    console.log(`[INTERACTION] showToolbox target screen coords: (${screenX}, ${screenY - 90})`);
                    // Consistently shift 90px higher
                    this.callbacks.showToolbox(node, screenX, screenY - 90);
                }
                this.clickTimer = null;
            }, RENDER_CONFIG.interaction.doubleClickDelay);
        }
    }

    public handleEdgeClick(edge: Edge, x: number, y: number): void {
        if (!this.state.interaction.isEditable) return;
        const zoom = this.state.view.zoom || 1;
        const screenX = (x * zoom) + this.state.view.offsetX;
        const screenY = (y * zoom) + this.state.view.offsetY;
        // Shift 90px higher as requested
        console.log(`[INTERACTION] showEdgeToolbox at screen: (${screenX}, ${screenY - 90})`);
        this.callbacks.showEdgeToolbox(edge, screenX, screenY - 90);
    }
}
