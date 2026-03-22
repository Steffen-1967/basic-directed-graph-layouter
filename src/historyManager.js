/**
 * Generic History Manager for Command-Pattern Actions.
 * Handles Undo, Redo, and LocalStorage Persistence.
 */
class HistoryManager {
    /**
     * @param {Object} options
     * @param {number} [options.maxSteps=50]
     * @param {string} [options.persistenceKey='mylife_snapshot']
     */
    constructor(options = {}) {
        this.maxSteps = options.maxSteps || 50;
        this.persistenceKey = options.persistenceKey || 'mylife_snapshot';
        this.undoStack = [];
        this.redoStack = [];
        this.savePointer = -1;
    }

    /**
     * Executes a new action and adds it to the undo stack.
     * Clears the redo stack.
     * @param {Object} action - Must implement execute() and undo()
     * @param {ProcessNode[]} currentNodes - The current state of nodes to persist
     */
    execute(action, currentNodes) {
        action.execute();
        this.undoStack.push(action);
        this.redoStack = [];

        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
            if (this.savePointer >= 0) this.savePointer--;
        }

        this.persist(currentNodes);
    }

    /**
     * Undoes the last action.
     * @param {ProcessNode[]} currentNodes - The current state of nodes to persist
     * @returns {Object|null} The undone action or null
     */
    undo(currentNodes) {
        if (this.undoStack.length === 0) return null;

        const action = this.undoStack.pop();
        action.undo();
        this.redoStack.push(action);

        this.persist(currentNodes);
        return action;
    }

    /**
     * Redoes the last undone action.
     * @param {ProcessNode[]} currentNodes - The current state of nodes to persist
     * @returns {Object|null} The redone action or null
     */
    redo(currentNodes) {
        if (this.redoStack.length === 0) return null;

        const action = this.redoStack.pop();
        action.execute();
        this.undoStack.push(action);

        this.persist(currentNodes);
        return action;
    }

    /**
     * Resets the history stacks.
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.savePointer = -1;
        localStorage.removeItem(this.persistenceKey);
    }

    /**
     * Persists the current node state to LocalStorage.
     * @param {ProcessNode[]} nodes 
     */
    persist(nodes) {
        try {
            const snapshot = {
                nodes: nodes,
                timestamp: Date.now(),
                serverTimestamp: nodes.serverTimestamp || null, // Store server file timestamp
                version: 1, // Schema version for future compatibility
                tabId: this.tabId || (this.tabId = Math.random().toString(36).substring(2, 9)),
                // Note: We don't persist the action stack itself as it might contain
                // complex objects/references. We persist the resulting state.
            };
            localStorage.setItem(this.persistenceKey, JSON.stringify(snapshot));
        } catch (e) {
            console.error('[HISTORY] Failed to persist state to LocalStorage. Changes can not be buffered and might get lost, proceed with caution.', e);
        }
    }

    /**
     * Recovers state from LocalStorage.
     * @returns {Object|null} Object with { nodes, timestamp, serverTimestamp } or null
     */
    recover() {
        try {
            const data = localStorage.getItem(this.persistenceKey);
            if (!data) return null;
            const snapshot = JSON.parse(data);
            
            // Check if snapshot is from a different tab
            if (snapshot.tabId && snapshot.tabId !== this.tabId) {
                console.warn('[HISTORY] Snapshot from different tab detected. Proceeding with caution.');
            }
            
            // Check schema version
            if (snapshot.version && snapshot.version > 1) {
                console.warn('[HISTORY] Snapshot has newer schema version. Data might be incompatible.');
            }
            
            return {
                nodes: snapshot.nodes,
                timestamp: snapshot.timestamp,
                serverTimestamp: snapshot.serverTimestamp
            };
        } catch (e) {
            console.error('[HISTORY] Failed to recover state from LocalStorage. Buffered changes are lost, proceed with caution.', e);
            return null;
        }
    }

    /**
     * Checks if there are unsaved changes.
     * @returns {boolean}
     */
    isDirty() {
        // Simple heuristic: if there is something in the undo stack since last save
        // Or if a snapshot exists in localStorage that differs from the original.
        return this.undoStack.length > 0 || !!localStorage.getItem(this.persistenceKey);
    }
}

// Export for browser use
if (typeof module !== 'undefined') {
    module.exports = HistoryManager;
}
