/**
 * @file state.ts
 * Central state management for the application.
 * Includes event-driven state change notification system.
 */

import { ScenarioNode, TaskCollectionScenario } from './manifest.js';
import { Edge } from './renderer.js';

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
    | { type: 'SCENARIO_LOADED', scenarioName: string }
    | { type: 'GRAPH_REFRESHED' }
    | { type: 'HOVER_CHANGED', nodeId: string | null, edgeFromId: string | null, edgeToId: string | null };

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

export interface InteractionState {
    isEditable: boolean;
    isDragging: boolean;
    startX: number;
    startY: number;
    lastMouseX: number;
    lastMouseY: number;
    
    // Hover states
    hoveredNode: ScenarioNode | null;
    hoveredNodeHandle: NodeHandle | null;
    hoveredEdge: Edge | null;
    hoveredEdgeHandle: number | null;
    
    // Selection states
    selectedNode: ScenarioNode | null;
    selectedEdge: Edge | null;
    
    // UI Overlays
    editingNode: ScenarioNode | null;
    toolboxTargetNode: ScenarioNode | null;
}

export interface NetworkState {
    ws: WebSocket | null;
    clientId: string | null;
    currentScenarioLock: { scenario: string, holder: string } | null;
    isLockedByOther: boolean;
}

export interface AppState {
    scenario: TaskCollectionScenario | null;
    nodes: ScenarioNode[];
    view: ViewState;
    interaction: InteractionState;
    network: NetworkState;
    isDirty: boolean;
}

/**
 * Initial application state.
 */
export const initialAppState: AppState = {
    scenario: null,
    nodes: [],
    view: { offsetX: 0, offsetY: 0, zoom: 1.0 },
    interaction: {
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
    network: {
        ws: null,
        clientId: null,
        currentScenarioLock: null,
        isLockedByOther: false
    },
    isDirty: false
};
