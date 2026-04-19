'use client';

import React from 'react';
import BaseOverlay from './BaseOverlay';
import { GraphNode } from '../../manifest';
import { StateManager } from '../../stateManager';
import { HistoryManager } from '../../historyManager';
import { UpdateNodePropertyAction, CompositeAction } from '../../actions';
import { X, Check } from 'lucide-react'; // Check icon might be useful for confirmation, though not used in this version

interface ColorPickerProps {
    node: GraphNode;
    stateManager: StateManager;
    history: HistoryManager;
    initialPosition?: { x: number, y: number } | null;
    onClose: () => void;
    renderAll: () => void;
}

const COLOR_SCHEMES = [
    { fill: null, stroke: null, label: 'Default' },
    { fill: '#e7f5ff', stroke: '#1971c2', label: 'Hellblau / Dunkelblau' },
    { fill: '#fdf2e9', stroke: '#af601a', label: 'Hellbraun / Dunkelbraun' },
    { fill: '#ebfbee', stroke: '#2b8a3e', label: 'Hellgrün / Dunkelgrün' },
    { fill: '#fff5f5', stroke: '#c92a2a', label: 'Hellrot / Dunkelrot' },
    { fill: '#f8f0fc', stroke: '#862e9c', label: 'Hellviolett / Dunkelviolett' },
    { fill: '#fff9db', stroke: '#e67700', label: 'Hellorange / Dunkelorange' },
    { fill: '#e3fafc', stroke: '#0b7285', label: 'Helltürkis / Dunkeltürkis' },
    { fill: 'CANCEL', stroke: 'CANCEL', label: 'Abbrechen' }
];

export default function ColorPicker({
    node,
    stateManager,
    history,
    initialPosition,
    onClose,
    renderAll
}: ColorPickerProps) {
    const state = stateManager.getRawState();

    const handleApplyColor = (fillColor: string | null, strokeColor: string | null) => {
        if (fillColor === 'CANCEL') {
            onClose();
            return;
        }

        // Ensure state.envelope is valid before executing the action
        if (!state.envelope) {
            console.error("Cannot apply color: state.envelope is undefined.");
            return; // Exit if envelope is not available
        }

        const actions = [
            new UpdateNodePropertyAction(state.nodes, node.id, 'overrideFillColor', fillColor, node.overrideFillColor),
            new UpdateNodePropertyAction(state.nodes, node.id, 'overrideStrokeColor', strokeColor, node.overrideStrokeColor)
        ];
        const composite = new CompositeAction(actions as any);
        history.execute(composite, state.envelope); 
        renderAll();
        onClose();
    };

    return (
        <BaseOverlay 
            title="Farbe wählen"
            initialPosition={initialPosition}
            onClose={onClose}
            width={260}
            height="auto"
        >
            <div className="overlay-content" style={{ padding: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}> {/* Centered content */}
                <div className="color-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns for 3x3 layout
                    gap: '10px', // Space between color swatches
                    justifyContent: 'center', // Center grid within its container
                    alignItems: 'center', // Center items vertically within cells
                    padding: '10px', // Padding around the grid
                    border: '1px solid #ccc', // Light border for the grid container
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa' // Light background for the grid area
                }}>
                    {COLOR_SCHEMES.map((scheme, index) => {
                        // Determine border color for the swatch
                        const borderColor = (scheme.stroke === 'CANCEL') ? '#adb5bd' : (scheme.stroke || '#495057');

                        return (
                            <div 
                                key={index} 
                                className="color-btn" 
                                title={scheme.label}
                                onMouseDown={(e) => { e.stopPropagation(); handleApplyColor(scheme.fill, scheme.stroke); }}
                                style={{ 
                                    backgroundColor: (scheme.fill === 'CANCEL' || scheme.fill === null) ? '#ffffff' : scheme.fill,
                                    width: '60px', 
                                    height: '60px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    border: `2px solid ${borderColor}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'border-color 0.2s ease-in-out, transform 0.1s ease-in-out',
                                }}
                                onMouseOver={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = '#007bff'}
                                onMouseOut={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = borderColor}
                            >
                                {scheme.label === 'Abbrechen' && (
                                    <X size={20} color={borderColor} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* BaseOverlay handles its own footer/close mechanism. 
                ColorPicker closes via handleApplyColor calling onClose(). */}
        </BaseOverlay>
    );
}
