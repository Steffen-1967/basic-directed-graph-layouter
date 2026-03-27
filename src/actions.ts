/**
 * @file actions.ts
 * Library of Action classes for the Command-Pattern.
 * These actions are used for undo/redo functionality and state management.
 */

import { ScenarioNode, Relation } from './manifest.js';
import { Action } from './historyManager.js';

/**
 * Action to update a property of a node.
 * Implements the Command pattern for node property updates.
 */
export class UpdateNodePropertyAction implements Action {
    constructor(
        public nodes: ScenarioNode[],
        public nodeId: string,
        public property: string,
        public newValue: any,
        public oldValue: any
    ) {}

    execute(): void {
        const node = this.nodes.find(n => n.id === this.nodeId);
        if (node) {
            (node as any)[this.property] = this.newValue;
        }
    }

    undo(): void {
        const node = this.nodes.find(n => n.id === this.nodeId);
        if (node) {
            (node as any)[this.property] = this.oldValue;
        }
    }

    focus(): string {
        return this.nodeId;
    }
}

/**
 * Action to update a property of an edge (relation).
 * Handles updates in both source (successors) and target (predecessors) node relations.
 */
export class UpdateEdgePropertyAction implements Action {
    constructor(
        public nodes: ScenarioNode[],
        public fromId: string,
        public toId: string,
        public property: string,
        public newValue: any,
        public oldValue: any
    ) {}

    execute(): void {
        this.updateRelation(this.newValue);
    }

    undo(): void {
        this.updateRelation(this.oldValue);
    }

    private updateRelation(value: any): void {
        const startNode = this.nodes.find(n => n.id === this.fromId);
        const endNode = this.nodes.find(n => n.id === this.toId);

        if (startNode && startNode.successors) {
            const rel = startNode.successors.find(s => s.id === this.toId);
            if (rel) (rel as any)[this.property] = value;
        }

        if (endNode && endNode.predecessors) {
            const rel = endNode.predecessors.find(p => p.id === this.fromId);
            if (rel) (rel as any)[this.property] = value;
        }
    }

    focus(): string {
        return this.fromId;
    }
}

/**
 * Composite Action that groups multiple atomic actions into one single transaction.
 */
export class CompositeAction implements Action {
    constructor(public actions: (Action & { focus?: () => string | null })[]) {}

    execute(): void {
        this.actions.forEach(action => action.execute());
    }

    undo(): void {
        for (let i = this.actions.length - 1; i >= 0; i--) {
            this.actions[i].undo();
        }
    }

    focus(): string | null {
        if (this.actions.length > 0 && typeof this.actions[0].focus === 'function') {
            return this.actions[0].focus!();
        }
        return null;
    }
}

/**
 * Action to delete a node from the graph.
 */
export class DeleteNodeAction implements Action {
    public deletedNode: ScenarioNode | null = null;
    public predecessorId: string | null = null;
    public successorId: string | null = null;
    public originalPredecessorSuccessors: Map<string, Relation[]> = new Map();
    public originalSuccessorPredecessors: Map<string, Relation[]> = new Map();

    constructor(public nodes: ScenarioNode[], public nodeId: string) {
        const index = nodes.findIndex(n => n.id === nodeId);
        
        if (index !== -1) {
            const node = nodes[index];
            this.deletedNode = JSON.parse(JSON.stringify(node));
            this.predecessorId = (index > 0) ? nodes[index - 1].id : null;
            this.successorId = (index < nodes.length - 1) ? nodes[index + 1].id : null;
        } else {
            console.warn(`[ACTION] DeleteNodeAction: Node with ID ${nodeId} not found.`);
        }
    }

    execute(): void {
        if (!this.deletedNode) return;
        
        const index = this.nodes.findIndex(n => n.id === this.nodeId);
        if (index === -1) return;

        const node = this.nodes[index];
        const hasPredecessors = node.predecessors && node.predecessors.length > 0;
        const hasSuccessors = node.successors && node.successors.length > 0;

        // Remember predecessor's successor list and remove this node from list.
        if (hasPredecessors) {
            node.predecessors.forEach(predEntry => {
                const predNode = this.nodes.find(n => n.id === predEntry.id);
                if (predNode) {
                    this.originalPredecessorSuccessors.set(predEntry.id, [...predNode.successors]);
                    predNode.successors = predNode.successors.filter(s => s.id !== this.nodeId);
                }
            });
        }

        // Remember successor's predecessor list and remove this node from list.
        if (hasSuccessors) {
            node.successors.forEach(succEntry => {
                const succNode = this.nodes.find(n => n.id === succEntry.id);
                if (succNode) {
                    this.originalSuccessorPredecessors.set(succEntry.id, [...succNode.predecessors]);
                    succNode.predecessors = succNode.predecessors.filter(p => p.id !== this.nodeId);
                }
            });
        }

        if (hasPredecessors && hasSuccessors) {
            // Reconnect logic: bridge the gap between the FIRST predecessor and all successors.
			// Use the FIRST predecessor only to prevent problems with successor nodes, that don't support multiple predecessors.
            // We use the weight of the connection FROM the predecessor TO the deleted node.
            const firstPredEntry = node.predecessors[0];
            const reconnectWeight = firstPredEntry.weight;
            const predNode = this.nodes.find(n => n.id === firstPredEntry.id);

            if (predNode) {
                node.successors.forEach(succEntry => {
                    const succNode = this.nodes.find(n => n.id === succEntry.id);
                    if (!succNode) return;

                    // Reconnect predecessor -> successor using the weight from the predecessor's original edge
                    if (!predNode.successors.some(s => s.id === succEntry.id)) {
                        predNode.successors.push({ id: succEntry.id, weight: reconnectWeight });
                    }

                    // Reconnect successor -> predecessor using the same weight
                    if (!succNode.predecessors.some(p => p.id === predNode.id)) {
                        succNode.predecessors.push({ id: predNode.id, weight: reconnectWeight });
                    }
                });
            }
        }
        
        this.nodes.splice(index, 1);

        if ((window as any).refreshGraph) {
            (window as any).refreshGraph();
        }
    }

    undo(): void {
        if (!this.deletedNode) return;
        
		// Try to recover position from predecessor and insert.
        let inserted = false;
        if (this.predecessorId) {
            const predIndex = this.nodes.findIndex(n => n.id === this.predecessorId);
            if (predIndex !== -1) {
                this.nodes.splice(predIndex + 1, 0, this.deletedNode);
                inserted = true;
            }
        }
        
		// Try to recover position from successor and insert.
        if (!inserted && this.successorId) {
            const succIndex = this.nodes.findIndex(n => n.id === this.successorId);
            if (succIndex !== -1) {
                this.nodes.splice(succIndex, 0, this.deletedNode);
                inserted = true;
            }
        }
        
		// Fall-back insert.
        if (!inserted) {
            this.nodes.push(this.deletedNode);
        }

        this.originalPredecessorSuccessors.forEach((oldSuccs, predId) => {
            const predNode = this.nodes.find(n => n.id === predId);
            if (predNode) predNode.successors = oldSuccs;
        });

        this.originalSuccessorPredecessors.forEach((oldPreds, succId) => {
            const succNode = this.nodes.find(n => n.id === succId);
            if (succNode) succNode.predecessors = oldPreds;
        });

        if ((window as any).refreshGraph) {
            (window as any).refreshGraph();
        }
    }

    focus(): string {
        return this.nodeId;
    }
}

/**
 * Action to add a new node to the graph.
 */
export class AddNodeAction implements Action {
    public newNode: ScenarioNode;
    public predecessorId: string | null = null;
    public successorId: string | null = null;

    constructor(public nodes: ScenarioNode[], newNode: ScenarioNode, public insertAfterId: string | null = null) {
        this.newNode = JSON.parse(JSON.stringify(newNode));
    }

    execute(): void {
        let insertIndex = this.nodes.length;
        
        if (this.insertAfterId) {
            const predIndex = this.nodes.findIndex(n => n.id === this.insertAfterId);
            if (predIndex !== -1) {
                insertIndex = predIndex + 1;
            }
        }
        
        this.predecessorId = (insertIndex > 0) ? this.nodes[insertIndex - 1].id : null;
        this.successorId = (insertIndex < this.nodes.length) ? this.nodes[insertIndex].id : null;
        
        this.nodes.splice(insertIndex, 0, this.newNode);
    }

    undo(): void {
        const index = this.nodes.findIndex(n => n.id === this.newNode.id);
        if (index !== -1) {
            this.nodes.splice(index, 1);
        }
    }

    focus(): string {
        return this.newNode.id;
    }
}

// Global exposure for browser (legacy)
if (typeof window !== 'undefined') {
    (window as any).UpdateNodePropertyAction = UpdateNodePropertyAction;
    (window as any).UpdateEdgePropertyAction = UpdateEdgePropertyAction;
    (window as any).CompositeAction = CompositeAction;
    (window as any).DeleteNodeAction = DeleteNodeAction;
    (window as any).AddNodeAction = AddNodeAction;
}
