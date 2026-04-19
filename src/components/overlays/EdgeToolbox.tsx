'use client';

import { Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Edge } from '../../renderer';
import { OverlayManager } from '../../overlayManager';
import { HistoryManager } from '../../historyManager';
import { StateManager } from '../../stateManager';
import { DeleteEdgeAction } from '../../actions';

interface EdgeToolboxProps {
    edge: Edge;
    position: { x: number, y: number };
    overlayManager: OverlayManager;
    history: HistoryManager;
    stateManager: StateManager;
    renderAll: () => void;
}

export default function EdgeToolbox({ edge, overlayManager, history, stateManager, renderAll }: Omit<EdgeToolboxProps, 'position'>) {
    const handleDelete = () => {
        const state = stateManager.getRawState();
        const action = new DeleteEdgeAction(state.nodes, edge.fromId, edge.toId);
        history.execute(action, state.envelope!);
        stateManager.closeOverlay();
        renderAll();
    };

    return (
        <div id="edgeToolboxOverlay">
            <div 
                className="toolbox-btn" 
                onClick={() => overlayManager.handleEditEdgeProperties(edge)} 
                title="Kanten-Eigenschaften bearbeiten"
            >
                <Pencil size={18} />
            </div>
            <div 
                className="toolbox-btn" 
                onClick={() => overlayManager.handleChangeEdgeBehavior(edge)} 
                title="Kanten-Verhalten ändern"
            >
                <SlidersHorizontal size={18} />
            </div>
            <div 
                className="toolbox-btn disabled" 
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                title="Verbindung löschen (Deaktiviert)"
            >
                <Trash2 size={18} />
            </div>
        </div>
    );
}

