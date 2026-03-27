/**
 * @file state.ts
 * Central state management for the application.
 * Includes event-driven state change notification system.
 */
/**
 * Central event bus for state changes.
 * Implements the Observer pattern for decoupled communication.
 */
export class StateEventBus {
    constructor() {
        this.listeners = [];
    }
    /**
     * Subscribe to state change events.
     */
    subscribe(listener) {
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
    emit(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            }
            catch (error) {
                console.error('[EVENT] Error in listener:', error);
            }
        });
    }
    /**
     * Get current number of active listeners (for debugging).
     */
    getListenerCount() {
        return this.listeners.length;
    }
}
// Global singleton instance
export const stateEvents = new StateEventBus();
/**
 * Initial application state.
 */
export const initialAppState = {
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
