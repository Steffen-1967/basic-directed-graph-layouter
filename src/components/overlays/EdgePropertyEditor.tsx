'use client';

import React, { useState } from 'react';
import BaseOverlay from './BaseOverlay';
import { getLangValue, toMultiLang } from '../../manifest';
import { StateManager } from '../../stateManager';
import { HistoryManager } from '../../historyManager';
import { UpdateEdgePropertyAction } from '../../actions';
import { Edge } from '../../renderer';
import { Check, X } from 'lucide-react';

interface EdgePropertyEditorProps {
    edge: Edge;
    stateManager: StateManager;
    history: HistoryManager;
    initialPosition?: { x: number, y: number } | null;
    onClose: () => void;
    renderAll: () => void;
}

export default function EdgePropertyEditor({
    edge,
    stateManager,
    history,
    initialPosition,
    onClose,
    renderAll
}: EdgePropertyEditorProps) {
    const state = stateManager.getRawState();
    const fromNode = state.nodes.find(n => n.id === edge.fromId);
    const endNode = state.nodes.find(n => n.id === edge.toId);
    const rel = endNode?.incoming?.find(p => p.id === edge.fromId);
    
    const [description, setDescription] = useState(getLangValue(rel?.description));

    const handleSave = () => {
        const oldDesc = rel?.description ? getLangValue(rel.description) : '';
        
        if (oldDesc !== description) {
            if (state.envelope) {
                const action = new UpdateEdgePropertyAction(state.nodes, edge.fromId, edge.toId, 'description', toMultiLang(description), toMultiLang(oldDesc));
                history.execute(action, state.envelope);
                renderAll();
            }
        }
        onClose();
    };

    const title = "Kanten-Eigenschaften";

    return (
        <BaseOverlay 
            title={title}
            initialPosition={initialPosition}
            onClose={onClose}
            width={500}
            height={400}
        >
            <div className="overlay-content-wrapper" style={{ padding: '20px', gap: '15px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Beschreibung:</label>
                    <textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ flex: 1, resize: 'none' }}
                        autoFocus
                    />
                </div>
            </div>

            <div className="overlay-footer" style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                <button className="overlay-btn" onMouseDown={(e) => { e.stopPropagation(); onClose(); }}>
                    <X size={14} /> Abbruch
                </button>
                <button className="overlay-btn primary" onMouseDown={(e) => { e.stopPropagation(); handleSave(); }}>
                    <Check size={14} /> OK
                </button>
            </div>
        </BaseOverlay>
    );
}
