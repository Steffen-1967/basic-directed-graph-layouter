'use client';

import React, { useState } from 'react';
import BaseOverlay from './BaseOverlay';
import { StateManager } from '../../stateManager';
import { HistoryManager } from '../../historyManager';
import { UpdateEdgePropertyAction } from '../../actions';
import { Edge } from '../../renderer';
import { Check, X } from 'lucide-react';

interface EdgeWeightEditorProps {
    edge: Edge;
    stateManager: StateManager;
    history: HistoryManager;
    initialPosition?: { x: number, y: number } | null;
    onClose: () => void;
    renderAll: () => void;
}

export default function EdgeWeightEditor({
    edge,
    stateManager,
    history,
    initialPosition,
    onClose,
    renderAll
}: EdgeWeightEditorProps) {
    const state = stateManager.getRawState();
    const endNode = state.nodes.find(n => n.id === edge.toId);
    const rel = endNode?.incoming?.find(p => p.id === edge.fromId);
    const currentWeight = rel?.weight || 1;
    
    const [weight, setWeight] = useState(currentWeight);

    const handleSave = () => {
        if (weight !== currentWeight) {
            const action = new UpdateEdgePropertyAction(state.nodes, edge.fromId, edge.toId, 'weight', weight, currentWeight);
            history.execute(action, state.envelope!);
            renderAll();
        }
        onClose();
    };

    return (
        <BaseOverlay 
            title="Kantengewicht"
            initialPosition={initialPosition}
            onClose={onClose}
            width={350}
            height="auto"
        >
            <div className="overlay-content" style={{ padding: '20px' }}>
                <div style={{ fontSize: '12px', marginBottom: '12px', color: '#666' }}>
                    Hinweis: Das Kantengewicht definiert die Präferenz bei Layoutberechnungen.
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Gewicht (1-10):</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        value={weight} 
                        onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
                        className="property-name-input"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    />
                </div>
            </div>

            <div className="overlay-footer">
                <button className="overlay-btn" onClick={onClose}>
                    <X size={14} /> Abbruch
                </button>
                <button className="overlay-btn primary" onClick={handleSave}>
                    <Check size={14} /> OK
                </button>
            </div>
        </BaseOverlay>
    );
}
