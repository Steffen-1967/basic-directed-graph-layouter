/**
 * @file actions.ts
 * Library of Action classes for the Command-Pattern.
 * These actions are used for undo/redo functionality and state management.
 */

import { GraphNode, GraphEdge, Envelope, iterateAllNodes } from './manifest';
import { Action } from './historyManager';

/**
 * Action to update a property of a node.
 * Implements the Command pattern for node property updates.
 */
export class UpdateNodePropertyAction implements Action {
    private targetNode: GraphNode | undefined = undefined;

    constructor(
        public nodes: GraphNode[],
        public nodeId: string,
        public property: string,
        public newValue: any,
        public oldValue: any
    ) {}

    private findNode(): GraphNode | undefined {
        if (this.targetNode) return this.targetNode;
        
        // Search in flat array first (for backwards compatibility)
        let found = this.nodes.find(n => n.id === this.nodeId);
        if (found) {
            this.targetNode = found;
            return found;
        }
        
        // If nodes is actually an Envelope structure, search recursively
        // This handles cases where the action is created with state.nodes which might be the full hierarchy
        for (const node of this.nodes) {
            if (node.id === this.nodeId) {
                this.targetNode = node;
                return node;
            }
            if (node.nodes && Array.isArray(node.nodes)) {
                const searchInChildren = (children: GraphNode[]): GraphNode | undefined => {
                    for (const child of children) {
                        if (child.id === this.nodeId) return child;
                        if (child.nodes) {
                            const found = searchInChildren(child.nodes);
                            if (found) return found;
                        }
                    }
                    return undefined;
                };
                found = searchInChildren(node.nodes);
                if (found) {
                    this.targetNode = found;
                    return found;
                }
            }
        }
        
        return undefined;
    }

    execute(): void {
        const node = this.findNode();
        if (node) {
            (node as any)[this.property] = this.newValue;
        }
    }

    undo(): void {
        const node = this.findNode();
        if (node) {
            (node as any)[this.property] = this.oldValue;
        }
    }

    focus(): string {
        return this.nodeId;
    }
}

/**
 * Action to update a property of an edge (GraphEdge).
 * Handles updates in both source (outgoing) and target (incoming) node relations.
 */
export class UpdateEdgePropertyAction implements Action {
    constructor(
        public nodes: GraphNode[],
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

        if (startNode && startNode.outgoing) {
            const rel = startNode.outgoing.find(s => s.id === this.toId);
            if (rel) (rel as any)[this.property] = value;
        }

        if (endNode && endNode.incoming) {
            const rel = endNode.incoming.find(p => p.id === this.fromId);
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
    public deletedNode: GraphNode | null = null;
    public predecessorId: string | null = null;
    public successorId: string | null = null;
    public oldIncomingOutgoing: Map<string, GraphEdge[]> = new Map();
    public oldOutgoingIncoming: Map<string, GraphEdge[]> = new Map();

    constructor(public nodes: GraphNode[], public nodeId: string) {
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
        const hasIncoming = node.incoming && node.incoming.length > 0;
        const hasOutgoing = node.outgoing && node.outgoing.length > 0;

        // Remember predecessor's outgoing list and remove this node from list.
        if (hasIncoming) {
            node.incoming.forEach(predEntry => {
                const predNode = this.nodes.find(n => n.id === predEntry.id);
                if (predNode) {
                    this.oldIncomingOutgoing.set(predEntry.id, [...predNode.outgoing]);
                    predNode.outgoing = predNode.outgoing.filter(s => s.id !== this.nodeId);
                }
            });
        }

        // Remember successor's incoming list and remove this node from list.
        if (hasOutgoing) {
            node.outgoing.forEach(succEntry => {
                const succNode = this.nodes.find(n => n.id === succEntry.id);
                if (succNode) {
                    this.oldOutgoingIncoming.set(succEntry.id, [...succNode.incoming]);
                    succNode.incoming = succNode.incoming.filter(p => p.id !== this.nodeId);
                }
            });
        }

        if (hasIncoming && hasOutgoing) {
            // Reconnect logic: bridge the gap between the FIRST incoming node and all outgoing nodes.
            // Use the FIRST incoming only to prevent problems with outgoing nodes, that don't support multiple incoming connections.
            // We use the weight of the connection FROM the incoming node TO the deleted node.
            const firstPredEntry = node.incoming[0];
            const reconnectWeight = firstPredEntry.weight;
            const predNode = this.nodes.find(n => n.id === firstPredEntry.id);

            if (predNode) {
                node.outgoing.forEach(succEntry => {
                    const succNode = this.nodes.find(n => n.id === succEntry.id);
                    if (!succNode) return;

                    // Reconnect incoming -> outgoing using the weight from the incoming's original edge
                    if (!predNode.outgoing.some(s => s.id === succEntry.id)) {
                        predNode.outgoing.push({ id: succEntry.id, weight: reconnectWeight, locked: false });
                    }

                    // Reconnect outgoing -> incoming using the same weight and preserving type if it exists
                    if (!succNode.incoming.some(p => p.id === predNode.id)) {
                        const newRel: GraphEdge = { 
                            id: predNode.id, 
                            weight: reconnectWeight,
                            locked: false
                        };
                        if (firstPredEntry.type) newRel.type = firstPredEntry.type;
                        succNode.incoming.push(newRel);
                    }
                });
            }
        }
        
        this.nodes.splice(index, 1);
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

        this.oldIncomingOutgoing.forEach((oldSuccs, predId) => {
            const predNode = this.nodes.find(n => n.id === predId);
            if (predNode) predNode.outgoing = oldSuccs;
        });

        this.oldOutgoingIncoming.forEach((oldPreds, succId) => {
            const succNode = this.nodes.find(n => n.id === succId);
            if (succNode) succNode.incoming = oldPreds;
        });
    }

    focus(): string {
        return this.nodeId;
    }
}

/**
 * Action to add a new node to the graph.
 */
export class AddNodeAction implements Action {
    public newNode: GraphNode;
    public predecessorId: string | null = null;
    public successorId: string | null = null;

    constructor(public nodes: GraphNode[], newNode: GraphNode, public insertAfterId: string | null = null) {
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

/**
 * Action to create a new edge between two nodes.
 */
export class CreateEdgeAction implements Action {
    constructor(
        public nodes: GraphNode[],
        public fromId: string,
        public toId: string,
        public type?: string,
        public weight: number = 1
    ) {}

    execute(): void {
        const fromNode = this.nodes.find(n => n.id === this.fromId);
        const toNode = this.nodes.find(n => n.id === this.toId);

        if (fromNode && toNode) {
            fromNode.outgoing = fromNode.outgoing || [];
            if (!fromNode.outgoing.some(e => e.id === this.toId)) {
                fromNode.outgoing.push({ id: this.toId, weight: this.weight, type: this.type });
            }

            toNode.incoming = toNode.incoming || [];
            if (!toNode.incoming.some(e => e.id === this.fromId)) {
                toNode.incoming.push({ id: this.fromId, weight: this.weight, type: this.type });
            }
        }
    }

    undo(): void {
        const fromNode = this.nodes.find(n => n.id === this.fromId);
        const toNode = this.nodes.find(n => n.id === this.toId);

        if (fromNode && fromNode.outgoing) {
            fromNode.outgoing = fromNode.outgoing.filter(e => e.id !== this.toId);
        }
        if (toNode && toNode.incoming) {
            toNode.incoming = toNode.incoming.filter(e => e.id !== this.fromId);
        }
    }

    focus(): string {
        return this.fromId;
    }
}

/**
 * Action to delete an edge between two nodes.
 */
export class DeleteEdgeAction implements Action {
    private deletedEdge: GraphEdge | undefined;

    constructor(
        public nodes: GraphNode[],
        public fromId: string,
        public toId: string
    ) {}

    execute(): void {
        const fromNode = this.nodes.find(n => n.id === this.fromId);
        const toNode = this.nodes.find(n => n.id === this.toId);

        if (fromNode && fromNode.outgoing) {
            const index = fromNode.outgoing.findIndex(e => e.id === this.toId);
            if (index !== -1) {
                this.deletedEdge = fromNode.outgoing[index];
                fromNode.outgoing.splice(index, 1);
            }
        }
        if (toNode && toNode.incoming) {
            toNode.incoming = toNode.incoming.filter(e => e.id !== this.fromId);
        }
    }

    undo(): void {
        if (!this.deletedEdge) return;
        const fromNode = this.nodes.find(n => n.id === this.fromId);
        const toNode = this.nodes.find(n => n.id === this.toId);

        if (fromNode && toNode) {
            fromNode.outgoing = fromNode.outgoing || [];
            fromNode.outgoing.push(this.deletedEdge);
            
            toNode.incoming = toNode.incoming || [];
            toNode.incoming.push({ ...this.deletedEdge, id: this.fromId });
        }
    }

    focus(): string {
        return this.fromId;
    }
}

// Global exposure for browser (legacy)
if (typeof window !== 'undefined') {
    (window as any).UpdateNodePropertyAction = UpdateNodePropertyAction;
    (window as any).UpdateEdgePropertyAction = UpdateEdgePropertyAction;
    (window as any).CompositeAction = CompositeAction;
    (window as any).DeleteNodeAction = DeleteNodeAction;
    (window as any).AddNodeAction = AddNodeAction;
    (window as any).CreateEdgeAction = CreateEdgeAction;
    (window as any).DeleteEdgeAction = DeleteEdgeAction;
}
