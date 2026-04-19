/**
 * @file stateManager.ts
 * @description Centralized state management with validation and notification.
 */

import { AppState, initialAppState, stateEvents, OverlayType } from './state';
import { GraphNode, Envelope, LayoutType, getLangValue } from './manifest';

/**
 * StateManager class wraps the AppState and provides controlled access to updates.
 */
export class StateManager {
    private state: AppState;
    private uiQueue: Promise<any> = Promise.resolve();

    constructor(initialState?: AppState) {
        // Use the provided state reference or fall back to initial clone
        this.state = initialState || JSON.parse(JSON.stringify(initialAppState));

        // Sync dirty state from events (e.g. from HistoryManager)
        stateEvents.subscribe((event) => {
            if (event.type === 'DIRTY_STATE_CHANGED') {
                this.state.isDirty = event.isDirty;
            }
        });
    }

    /**
     * Executes an asynchronous task within the UI sequence queue.
     * This ensures that UI operations (like closing one modal and opening another)
     * happen in a strict, predictable order without overlapping.
     */
    async executeUISequence<T>(task: () => Promise<T>): Promise<T> {
        const nextInQueue = this.uiQueue.then(async () => {
            try {
                return await task();
            } catch (error) {
                console.error('[STATE-MANAGER] Error in UI sequence task:', error);
                throw error;
            }
        });
        this.uiQueue = nextInQueue.catch(() => {}); // Maintain queue even on failure
        return nextInQueue;
    }

    /**
     * Get the current read-only state.
     */
    getState(): Readonly<AppState> {
        return this.state;
    }

    /**
     * Get a copy of the current state.
     * We create new references for top-level objects to trigger React re-renders
     * while avoiding circular reference errors from JSON.stringify.
     */
    getRawState(): AppState {
        return {
            ...this.state,
            nodes: [...this.state.nodes],
            interaction: {
                ...this.state.interaction,
                nodesToLayout: this.state.interaction.nodesToLayout ? [...this.state.interaction.nodesToLayout] : null
            },
            view: { ...this.state.view },
            ui: { ...this.state.ui },
            network: { ...this.state.network }
        };
    }

    /**
     * Update the view coordinates.
     */
    updateView(offsetX: number, offsetY: number): void {
        this.state.view.offsetX = offsetX;
        this.state.view.offsetY = offsetY;
        stateEvents.emit({ type: 'VIEW_CHANGED', offsetX, offsetY });
    }

    /**
     * Select a node.
     */
    selectNode(node: GraphNode | null): void {
        console.log(`[STATE-MANAGER] selectNode: ${node?.id || 'null'}`);
        this.state.interaction.selectedNode = node;
        this.state.interaction.selectedEdge = null;
        stateEvents.emit({ type: 'NODE_SELECTED', nodeId: node?.id || null });
        stateEvents.emit({ type: 'RENDER_REQUESTED' });
    }

    /**
     * Select an edge.
     */
    selectEdge(fromId: string | null, toId: string | null): void {
        console.log(`[STATE-MANAGER] selectEdge: ${fromId} -> ${toId}`);
        if (fromId && toId) {
            this.state.interaction.selectedEdge = { fromId, toId };
        } else {
            this.state.interaction.selectedEdge = null;
        }
        this.state.interaction.selectedNode = null;
        stateEvents.emit({ type: 'EDGE_SELECTED', fromId, toId });
        stateEvents.emit({ type: 'RENDER_REQUESTED' });
    }

    /**
     * Set the current envelope.
     */
    setEnvelope(envelope: Envelope | null, nodes: GraphNode[]): void {
        console.log(`[STATE-MANAGER] setEnvelope called. Node count: ${nodes.length}. Envelope: ${envelope?.name ? getLangValue(envelope.name) : 'null'}`);
        this.state.envelope = envelope ? { ...envelope } : null;
        this.state.nodes = [...nodes]; // Ensure new array reference
        this.state.isDirty = false;
        
        // Explicitly clear interactions to avoid stale state
        this.state.interaction.selectedNode = null;
        this.state.interaction.selectedEdge = null;
        this.state.interaction.nodesToLayout = null; 

        stateEvents.emit({ type: 'ENVELOPE_LOADED', name: envelope?.name || 'Empty' });
        stateEvents.emit({ type: 'RENDER_REQUESTED' });
    }

    /**
     * Toggle edit mode.
     */
    setEditable(isEditable: boolean): void {
        console.log(`[STATE-MANAGER] setEditable: ${isEditable}`);
        this.state.interaction.isEditable = isEditable;
        stateEvents.emit({ type: 'EDIT_MODE_CHANGED', isEditable });
        stateEvents.emit({ type: 'RENDER_REQUESTED' });
    }

    /**
     * Set the active layout type.
     */
    setActiveLayoutType(type: LayoutType): void {
        console.log(`[STATE-MANAGER] setActiveLayoutType: ${type}`);
        this.state.interaction.activeLayoutType = type;
        stateEvents.emit({ type: 'LAYOUT_TYPE_CHANGED', layoutType: type });
        stateEvents.emit({ type: 'RENDER_REQUESTED' });
    }

    /**
     * Set the nodes to be displayed in the current layout (filtered nodes).
     */
    setNodesToLayout(nodes: GraphNode[] | null): void {
        console.log(`[STATE-MANAGER] setNodesToLayout. Node count: ${nodes ? nodes.length : 'null'}`);
        this.state.interaction.nodesToLayout = nodes ? [...nodes] : null; // Ensure new reference
        stateEvents.emit({ type: 'RENDER_REQUESTED' });
    }

    /**
     * Mark state as dirty (unsaved changes).
     */
    setDirty(isDirty: boolean): void {
        if (this.state.isDirty !== isDirty) {
            console.log(`[STATE-MANAGER] setDirty: ${isDirty}`);
            this.state.isDirty = isDirty;
            stateEvents.emit({ type: 'DIRTY_STATE_CHANGED', isDirty });
        }
    }

    /**
     * Update a node property.
     */
    updateNodeProperty(nodeId: string, property: string, value: any): void {
        const node = this.state.nodes.find(n => n.id === nodeId);
        if (node) {
            console.log(`[STATE-MANAGER] updateNodeProperty: node=${nodeId}, prop=${property}`);
            (node as any)[property] = value;
            this.setDirty(true);
            stateEvents.emit({ type: 'NODE_UPDATED', nodeId, property, value });
            stateEvents.emit({ type: 'RENDER_REQUESTED' });
        }
    }

    /**
     * Notify that the graph has been refreshed (e.g. after layout).
     */
    notifyGraphRefreshed(): void {
        stateEvents.emit({ type: 'GRAPH_REFRESHED' });
    }

    /**
     * Open a UI overlay.
     */
    openOverlay(type: OverlayType, data: any = null, position: { x: number, y: number } | null = null): void {
        console.log(`[STATE-MANAGER] openOverlay called. Type: ${type}, Pos: ${position ? `x=${position.x}, y=${position.y}` : 'null'}`);
        this.state.ui.activeOverlay = type;
        this.state.ui.overlayData = data;
        if (position) {
            this.state.ui.overlayPosition = { ...position };
        }
        console.log(`[STATE-MANAGER] State updated. Emitting UI_OVERLAY_CHANGED for ${type}`);
        stateEvents.emit({ type: 'UI_OVERLAY_CHANGED', overlay: type });
    }

    /**
     * Close the current UI overlay.
     */
    closeOverlay(): void {
        const current = this.state.ui.activeOverlay;
        console.log(`[STATE-MANAGER] closeOverlay called. Was: ${current}`);
        this.state.ui.activeOverlay = null;
        this.state.ui.overlayData = null;
        stateEvents.emit({ type: 'UI_OVERLAY_CHANGED', overlay: null });
    }

    /**
     * Update overlay position.
     */
    updateOverlayPosition(x: number, y: number): void {
        this.state.ui.overlayPosition = { x, y };
    }
}
