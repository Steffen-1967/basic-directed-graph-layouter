/**
 * Library of Action classes for the Command-Pattern.
 */

/**
 * Action to update a property of a node.
 */
class UpdatePropertyAction {
    /**
     * @param {ProcessNode[]} nodes - Reference to the node list
     * @param {string} nodeId - ID of the node to change (GUID)
     * @param {string} property - Property name (e.g., 'name', 'x', 'y')
     * @param {*} newValue - The new value
     * @param {*} oldValue - The old value (for undo)
     */
    constructor(nodes, nodeId, property, newValue, oldValue) {
        this.nodes = nodes;
        this.nodeId = nodeId;
        this.property = property;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }

    execute() {
        const node = this.nodes.find(n => n.id === this.nodeId);
        if (node) {
            node[this.property] = this.newValue;
        }
    }

    undo() {
        const node = this.nodes.find(n => n.id === this.nodeId);
        if (node) {
            node[this.property] = this.oldValue;
        }
    }

    /**
     * Focuses the node in the UI.
     * @returns {string} The node ID (GUID)
     */
    focus() {
        return this.nodeId;
    }
}

/**
 * Composite Action that groups multiple atomic actions into one.
 * Executes all sub-actions in order, undoes them in reverse order.
 */
class CompositeAction {
    /**
     * @param {Array<Object>} actions - Array of action objects (each must implement execute() and undo())
     */
    constructor(actions) {
        this.actions = actions;
    }

    execute() {
        this.actions.forEach(action => action.execute());
    }

    undo() {
        // Undo in reverse order
        for (let i = this.actions.length - 1; i >= 0; i--) {
            this.actions[i].undo();
        }
    }

    /**
     * Focuses the first action's node (if available).
     * @returns {string|null} The node ID or null
     */
    focus() {
        if (this.actions.length > 0 && typeof this.actions[0].focus === 'function') {
            return this.actions[0].focus();
        }
        return null;
    }
}

/**
 * Action to delete a node from the graph.
 * Stores the node's position in the array for precise restoration.
 */
class DeleteNodeAction {
    /**
     * @param {ProcessNode[]} nodes - Reference to the node list
     * @param {string} nodeId - ID of the node to delete (GUID)
     */
    constructor(nodes, nodeId) {
        this.nodes = nodes;
        this.nodeId = nodeId;
        
        const index = nodes.findIndex(n => n.id === nodeId);
        
        if (index !== -1) {
            // Deep Copy of the node (including original ID)
            const node = nodes[index];
            this.deletedNode = JSON.parse(JSON.stringify(node));
            
            // Store position information for restoration
            this.predecessorId = (index > 0) ? nodes[index - 1].id : null;
            this.successorId = (index < nodes.length - 1) ? nodes[index + 1].id : null;
        } else {
            // Node not found - store null to make action a no-op
            this.deletedNode = null;
            this.predecessorId = null;
            this.successorId = null;
            console.warn(`[ACTION] DeleteNodeAction: Node with ID ${nodeId} not found. Might be a race condition or timing problem, proceed with caution.`);
        }
    }

    execute() {
        if (!this.deletedNode) return; // No-op if node wasn't found
        
        const index = this.nodes.findIndex(n => n.id === this.nodeId);
        if (index === -1) {
            console.warn(`[WARN] DeleteNodeAction.execute(): Node ${this.nodeId} not found (already deleted?)`);
            return; // Idempotent: safe to call multiple times
        }
        
        this.nodes.splice(index, 1);
    }

    undo() {
        if (!this.deletedNode) return; // No-op if node wasn't found
        
        // Try to insert after predecessor
        if (this.predecessorId) {
            const predIndex = this.nodes.findIndex(n => n.id === this.predecessorId);
            if (predIndex !== -1) {
                this.nodes.splice(predIndex + 1, 0, this.deletedNode);
                return;
            }
        }
        
        // Try to insert before successor
        if (this.successorId) {
            const succIndex = this.nodes.findIndex(n => n.id === this.successorId);
            if (succIndex !== -1) {
                this.nodes.splice(succIndex, 0, this.deletedNode);
                return;
            }
        }
        
        // Fallback: Append to end
        this.nodes.push(this.deletedNode);
    }

    focus() {
        return this.nodeId;
    }
}

/**
 * Action to add a new node to the graph.
 * Optionally inserts the node after a specific predecessor.
 */
class AddNodeAction {
    /**
     * @param {ProcessNode[]} nodes - Reference to the node list
     * @param {ProcessNode} newNode - The node to add
     * @param {string|null} [insertAfterId=null] - Optional: ID of the node to insert after
     */
    constructor(nodes, newNode, insertAfterId = null) {
        this.nodes = nodes;
        this.newNode = JSON.parse(JSON.stringify(newNode)); // Deep Copy
        this.insertAfterId = insertAfterId;
        
        // Will be set during execute() to remember position for redo
        this.predecessorId = null;
        this.successorId = null;
    }

    execute() {
        let insertIndex = this.nodes.length; // Default: append to end
        
        // Try to insert after specified predecessor
        if (this.insertAfterId) {
            const predIndex = this.nodes.findIndex(n => n.id === this.insertAfterId);
            if (predIndex !== -1) {
                insertIndex = predIndex + 1;
            }
        }
        
        // Remember position for undo/redo
        this.predecessorId = (insertIndex > 0) ? this.nodes[insertIndex - 1].id : null;
        this.successorId = (insertIndex < this.nodes.length) ? this.nodes[insertIndex].id : null;
        
        this.nodes.splice(insertIndex, 0, this.newNode);
    }

    undo() {
        const index = this.nodes.findIndex(n => n.id === this.newNode.id);
        if (index !== -1) {
            this.nodes.splice(index, 1);
        }
    }

    focus() {
        return this.newNode.id;
    }
}

// Export for browser use
if (typeof module !== 'undefined') {
    module.exports = {
        UpdatePropertyAction,
        CompositeAction,
        DeleteNodeAction,
        AddNodeAction
    };
}
