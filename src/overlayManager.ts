/**
 * @file overlayManager.ts
 * Manages all interactive UI overlays (Property Editor, Color Picker, Edge Weight).
 */

import { createIcons, icons } from 'lucide';
import { GraphNode, Envelope, ListEntryInfo, getLangValue, toMultiLang } from './manifest';
import { Edge } from './renderer';
import { MarkdownEngine } from './markdown';
import { AppState } from './state';
import { HistoryManager } from './historyManager';
import { UpdateNodePropertyAction, UpdateEdgePropertyAction, CompositeAction } from './actions';
import { NetworkService } from './networkService';
import { StateManager } from './stateManager';
import { OverlayType } from './state';

export class OverlayManager {
    constructor(
        private state: AppState,
        private history: HistoryManager,
        private network: NetworkService,
        private stateManager: StateManager,
        private renderAll: () => void
    ) {}

    /**
     * Handles opening the generic server data selection modal.
     */
    async handleDataList(mode: 'load' | 'import'): Promise<void> {
        this.stateManager.openOverlay(OverlayType.DataList, {
            mode,
            onSelect: (selectedItem: ListEntryInfo) => {
                // TRICK: We wrap the selection logic in a UI sequence.
                // This ensures that the closure of the DataList overlay and the 
                // opening of any subsequent modals (like Recovery) happen in order.
                this.stateManager.executeUISequence(async () => {
                    this.stateManager.closeOverlay(); // Step 1: Close list
                    
                    // Step 2: Load data (might open RecoveryModal internally)
                    if (selectedItem.source === 'fs') {
                        if (mode === 'import') {
                            const envelope = await this.network.loadDataForStorageImport(selectedItem.fileName);
                            if (envelope) await this.network.saveUsecaseToDatabase(envelope);
                        } else {
                            await this.network.loadDataForDisplayAndEdit(selectedItem.fileName, null);
                        }
                    } else if (selectedItem.id) {
                        await this.network.loadDataForDisplayAndEdit(null, selectedItem);
                    }
                    this.renderAll();
                });
            }
        });
    }

    private makeDraggable(handle: HTMLElement, target: HTMLElement): void {
        // Drag logic is now handled by BaseOverlay or CSS for simple toolboxes
    }

    handleEditProperties(node: GraphNode): void {
        this.stateManager.openOverlay(OverlayType.NodeProperties, node, this.state.ui.overlayPosition);
    }

    hideNodePropertyOverlay(): void { 
        this.stateManager.closeOverlay();
    }

    private applyNodeProperties(node: GraphNode, newName: string, newDescription: string): void {
        const actions: any[] = [];
        
        const oldName = getLangValue(node.name);
        if (oldName !== newName) {
            actions.push(new UpdateNodePropertyAction(this.state.nodes, node.id, 'name', toMultiLang(newName), node.name));
        }

        const oldDesc = getLangValue(node.description);
        if (oldDesc !== newDescription) {
            actions.push(new UpdateNodePropertyAction(this.state.nodes, node.id, 'description', toMultiLang(newDescription), node.description));
        }

        if (actions.length > 0) {
            const composite = new CompositeAction(actions);
            this.history.execute(composite, this.state.envelope!);
            this.renderAll();
        }
    }

    handleEditEdgeProperties(edge: Edge): void {
        this.stateManager.openOverlay(OverlayType.EdgeProperties, edge, this.state.ui.overlayPosition);
    }

    hideEdgePropertyOverlay(): void { 
        this.stateManager.closeOverlay();
    }

    private applyEdgeProperties(edge: Edge, newDescription: string): void {
        const endNode = this.state.nodes.find(n => n.id === edge.toId);
        if (!endNode) return;
        const rel = endNode.incoming?.find(p => p.id === edge.fromId);
        const oldDesc = rel?.description || '';
        if (oldDesc === newDescription) return;
        
        const action = new UpdateEdgePropertyAction(this.state.nodes, edge.fromId, edge.toId, 'description', newDescription, oldDesc);
        this.history.execute(action, this.state.envelope!);
        this.renderAll();
    }

    handleChangeNodeBehavior(node: GraphNode): void { console.log('[ACTION] Change behavior for node:', node.id); }

    handleChangeEdgeBehavior(edge: Edge): void {
        this.stateManager.openOverlay(OverlayType.EdgeWeight, edge, this.state.ui.overlayPosition);
    }

    hideEdgeWeightOverlay(): void { 
        this.stateManager.closeOverlay();
    }

    private applyEdgeWeight(edge: Edge, newWeight: number): void {
        const endNode = this.state.nodes.find(n => n.id === edge.toId);
        if (!endNode) return;
        const oldWeight = endNode.incoming?.find(p => p.id === edge.fromId)?.weight || 1;
        if (oldWeight === newWeight) return;
        const action = new UpdateEdgePropertyAction(this.state.nodes, edge.fromId, edge.toId, 'weight', newWeight, oldWeight);
        this.history.execute(action, this.state.envelope!); this.renderAll();
    }

    handleSetColor(node: GraphNode): void {
        this.stateManager.openOverlay(OverlayType.ColorPicker, node, this.state.ui.overlayPosition);
    }

    hideColorPicker(): void { 
        this.stateManager.closeOverlay();
    }

    private applyColor(node: GraphNode, fillColor: string | null, strokeColor: string | null): void {
        const actions = [
            new UpdateNodePropertyAction(this.state.nodes, node.id, 'overrideFillColor', fillColor, node.overrideFillColor),
            new UpdateNodePropertyAction(this.state.nodes, node.id, 'overrideStrokeColor', strokeColor, node.overrideStrokeColor)
        ];
        const composite = new CompositeAction(actions as any);
        this.history.execute(composite, this.state.envelope!); this.renderAll();
    }
}
