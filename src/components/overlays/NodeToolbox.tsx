'use client';

import React from 'react';
import { Pencil, SlidersHorizontal, Palette, Trash2 } from 'lucide-react';
import { GraphNode, isLayoutStructureEditable } from '../../manifest';
import { OverlayManager } from '../../overlayManager';
import { HistoryManager } from '../../historyManager';
import { DeleteNodeAction } from '../../actions';
import { StateManager } from '../../stateManager';

interface NodeToolboxProps {
    node: GraphNode;
    overlayManager: OverlayManager;
    stateManager: StateManager;
    renderAll: () => void;
}

export default function NodeToolbox({ node, overlayManager, stateManager, renderAll }: NodeToolboxProps) {
    return (
        <div id="nodeToolboxOverlay" className="toolbox-container">
            <div 
                className="toolbox-btn" 
                onClick={() => overlayManager.handleEditProperties(node)} 
                title="Eigenschaften bearbeiten"
            >
                <Pencil size={18} />
            </div>
            <div 
                className="toolbox-btn" 
                onClick={() => overlayManager.handleChangeNodeBehavior(node)} 
                title="Verhalten ändern"
            >
                <SlidersHorizontal size={18} />
            </div>
            <div 
                className="toolbox-btn" 
                onClick={() => overlayManager.handleSetColor(node)} 
                title="Farbe festlegen"
            >
                <Palette size={18} />
            </div>
            <div 
                className="toolbox-btn disabled" 
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                title="Löschen (Deaktiviert)"
            >
                <Trash2 size={18} />
            </div>
        </div>
    );
}
