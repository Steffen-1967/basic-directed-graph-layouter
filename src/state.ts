/**
 * @file state.ts
 * Central state management for the application.
 * Includes event-driven state change notification system.
 */

import { GraphNode, Envelope } from './manifest';
import { Edge } from './renderer';

/**
 * Overlay types for the UI.
 */
export enum OverlayType {
    NodeProperties = 'NodeProperties',
    EdgeProperties = 'EdgeProperties',
    EdgeWeight = 'EdgeWeight',
    ColorPicker = 'ColorPicker',
    DataList = 'DataList',
    Modal = 'Modal',
    NodeToolbox = 'NodeToolbox',
    EdgeToolbox = 'EdgeToolbox',
    NodeInlineEdit = 'NodeInlineEdit'
}

/**
 * States for the InteractionService state machine.
 */
export enum InteractionState {
    Idle = 'Idle',
    DraggingCanvas = 'DraggingCanvas',
    DraggingNode = 'DraggingNode',
    LinkingNodes = 'LinkingNodes',
    Editing = 'Editing'
}

/**
 * Event types for state changes.
 */
export type StateChangeEvent = 
    | { type: 'NODE_SELECTED', nodeId: string | null }
    | { type: 'NODE_UPDATED', nodeId: string, property: string, value: any }
    | { type: 'EDGE_SELECTED', fromId: string | null, toId: string | null }
    | { type: 'VIEW_CHANGED', offsetX: number, offsetY: number }
    | { type: 'EDIT_MODE_CHANGED', isEditable: boolean }
    | { type: 'DIRTY_STATE_CHANGED', isDirty: boolean }
    | { type: 'ENVELOPE_LOADED', name: any }
    | { type: 'GRAPH_REFRESHED' }
    | { type: 'HOVER_CHANGED', nodeId: string | null, edgeFromId: string | null, edgeToId: string | null }
    | { type: 'UI_OVERLAY_CHANGED', overlay: OverlayType | null }
    | { type: 'RENDER_REQUESTED' };

export type StateChangeListener = (event: StateChangeEvent) => void;

/**
 * Central event bus for state changes.
 * Implements the Observer pattern for decoupled communication.
 */
export class StateEventBus {
    private listeners: StateChangeListener[] = [];

    /**
     * Subscribe to state change events.
     */
    subscribe(listener: StateChangeListener): () => void {
        this.listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Emit a state change event to all subscribers.
     */
    emit(event: StateChangeEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('[EVENT] Error in listener:', error);
            }
        });
    }

    /**
     * Get current number of active listeners (for debugging).
     */
    getListenerCount(): number {
        return this.listeners.length;
    }
}

// Global singleton instance
export const stateEvents = new StateEventBus();

/**
 * Precise identification of a node anchor handle.
 */
export interface NodeHandle {
    side: 'top' | 'bottom' | 'left' | 'right';
    index: 1 | 2 | 3;
}

export interface ViewState {
    offsetX: number;
    offsetY: number;
    zoom: number; 
}

export interface InteractionData {
    state: InteractionState;
    isEditable: boolean;
    isDragging: boolean;
    startX: number;
    startY: number;
    startOffsetX?: number;
    startOffsetY?: number;
    lastMouseX: number;
    lastMouseY: number;
    
    // Hover states
    hoveredNode: GraphNode | null;
    hoveredNodeHandle: NodeHandle | null;
    hoveredEdge: Edge | null;
    hoveredEdgeHandle: number | null;
    
    // Selection states
    selectedNode: GraphNode | null;
    selectedEdge: Edge | null;
    
    // UI Overlays
    editingNode: GraphNode | null;
    toolboxTargetNode: GraphNode | null;
}

export interface NetworkState {
    ws: WebSocket | null;
    clientId: string | null;
    currentEnvelopeLock: { envelope: string, holder: string } | null;
    isLockedByOther: boolean;
}

export interface UIState {
    activeOverlay: OverlayType | null;
    overlayData: any | null; 
    overlayPosition: { x: number, y: number } | null;
    isNodeToolboxOpen: boolean;
    isEdgeToolboxOpen: boolean;
    toolboxPosition: { x: number, y: number } | null;
}

export interface AppState {
    envelope: Envelope | null;
    nodes: GraphNode[];
    view: ViewState;
    interaction: InteractionData;
    ui: UIState;
    network: NetworkState;
    isDirty: boolean;
    storageImport: Envelope | null;
    currentFileName: string | null;
    currentDataSource: 'fs' | 'age' | 'firebase';
}

/**
 * Initial application state.
 */
export const initialAppState: AppState = {
    envelope: null,
    nodes: [],
    view: { offsetX: 100, offsetY: 100, zoom: 1.0 },
    interaction: {
        state: InteractionState.Idle,
        isEditable: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        lastMouseX: 0,
        lastMouseY: 0,
        hoveredNode: null,
        hoveredNodeHandle: null,
        hoveredEdge: null,
        hoveredEdgeHandle: null,
        selectedNode: null,
        selectedEdge: null,
        editingNode: null,
        toolboxTargetNode: null
    },
    ui: {
        activeOverlay: null,
        overlayData: null,
        overlayPosition: null,
        isNodeToolboxOpen: false,
        isEdgeToolboxOpen: false,
        toolboxPosition: null
    },
    network: {
        ws: null,
        clientId: null,
        currentEnvelopeLock: null,
        isLockedByOther: false
    },
    isDirty: false,
    storageImport: null,
    currentFileName: null,
    currentDataSource: 'fs'
};
