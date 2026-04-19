'use client';

import React, { useState, useEffect, useRef } from 'react';
import BaseOverlay from './BaseOverlay';
import { GraphNode, getLangValue, toMultiLang } from '../../manifest';
import { MarkdownEngine } from '../../markdown';
import { StateManager } from '../../stateManager';
import { HistoryManager } from '../../historyManager';
import { UpdateNodePropertyAction, CompositeAction } from '../../actions';
import { Eye, Edit2, HelpCircle, Check, X } from 'lucide-react';

interface NodePropertyEditorProps {
    node: GraphNode;
    stateManager: StateManager;
    history: HistoryManager;
    initialPosition?: { x: number, y: number } | null;
    onClose: () => void;
    renderAll: () => void;
}

export default function NodePropertyEditor({
    node,
    stateManager,
    history,
    initialPosition,
    onClose,
    renderAll
}: NodePropertyEditorProps) {
    const [name, setName] = useState(getLangValue(node.name));
    const [description, setDescription] = useState(getLangValue(node.description));
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [showHelp, setShowHelp] = useState(false);

    const handleSave = () => {
        const actions: any[] = [];
        const state = stateManager.getRawState();
        
        const oldName = getLangValue(node.name);
        if (oldName !== name) {
            actions.push(new UpdateNodePropertyAction(state.nodes, node.id, 'name', toMultiLang(name), node.name));
        }

        const oldDesc = getLangValue(node.description);
        if (oldDesc !== description) {
            actions.push(new UpdateNodePropertyAction(state.nodes, node.id, 'description', toMultiLang(description), node.description));
        }

        if (actions.length > 0) {
            const composite = new CompositeAction(actions);
            history.execute(composite, state.envelope!);
            renderAll();
        }
        onClose();
    };

    // Helper to get node name for title
    const nodeName = getLangValue(node.name);

    return (
        <BaseOverlay 
            title={`Knoten-Eigenschaften: ${nodeName}`}
            initialPosition={initialPosition}
            onClose={onClose}
            width={720}
            height={560}
        >
            {/* Start of BaseOverlay children */}
            <div className="overlay-content-wrapper" style={{ padding: '20px', gap: '15px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Name:</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="property-name-input"
                        autoFocus
                    />
                </div>

                {/* Description editor and preview area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Beschreibung (Markdown):</label>
                    
                    <div style={{ display: 'flex', flex: 1, gap: '15px', overflow: 'hidden' }}>
                        {viewMode === 'edit' ? (
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Beschreibung..."
                                style={{ flex: 1, resize: 'none' }} 
                            />
                        ) : (
                            <div 
                                className="preview-container"
                                style={{ flex: 1, overflowY: 'auto', padding: '12px', border: '1px solid #ced4da', borderRadius: '6px', backgroundColor: 'white', display: 'block' }}
                                dangerouslySetInnerHTML={{ __html: MarkdownEngine.render(description) }}
                            />
                        )}

                        {showHelp && (
                            <div className="help-sidebar" style={{ width: '220px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', backgroundColor: '#f8f9fa', fontSize: '11px', borderRadius: '6px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Markdown Hilfe</h4>
                                <table className="help-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}><th style={{ padding: '4px' }}>Was</th><th style={{ padding: '4px' }}>Wie</th></tr>
                                    </thead>
                                    <tbody>
                                        {MarkdownEngine.getSupportedRules().map((r, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f3f5' }}>
                                                <td style={{ padding: '6px 4px' }}>{r.label}</td>
                                                <td style={{ padding: '6px 4px' }}><code>{r.example}</code></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer with buttons */}
            <div className="overlay-footer" style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="footer-left"> {/* Buttons for Preview/Help */}
                    <button 
                        className={`overlay-btn ${viewMode === 'edit' ? '' : 'primary'}`} 
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setViewMode(viewMode === 'edit' ? 'preview' : 'edit'); }}
                    >
                        {viewMode === 'edit' ? <><Eye size={14} /> Vorschau</> : <><Edit2 size={14} /> Editieren</>}
                    </button>
                    <button 
                        className={`overlay-btn ${showHelp ? 'primary' : ''}`} 
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowHelp(!showHelp); }}
                        >
                        <HelpCircle size={14} /> Hilfe
                        </button>
                </div>
                <div className="footer-right"> {/* Buttons for Cancel/OK */}
                    <button className="overlay-btn" onMouseDown={(e) => { e.stopPropagation(); onClose(); }}>
                        <X size={14} /> Abbruch
                    </button>
                    <button className="overlay-btn primary" onMouseDown={(e) => { e.stopPropagation(); handleSave(); }}>
                        <Check size={14} /> OK
                    </button>
                </div>
            </div>
            {/* End of BaseOverlay children */}
        </BaseOverlay>
    );
}
