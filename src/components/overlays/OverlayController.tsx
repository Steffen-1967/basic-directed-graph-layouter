'use client';

import React, { useState, useEffect } from 'react';
import { StateManager } from '../../stateManager';
import { HistoryManager } from '../../historyManager';
import { stateEvents, OverlayType } from '../../state';
import { NetworkService } from '../../networkService';
import { OverlayManager } from '../../overlayManager';

import NodeToolbox from './NodeToolbox';
import EdgeToolbox from './EdgeToolbox';
import NodeInlineEdit from './NodeInlineEdit';
import DataListModal from './DataListModal';
import GenericModal from './GenericModal';
import ColorPicker from './ColorPicker';
import EdgeWeightEditor from './EdgeWeightEditor';
import EdgePropertyEditor from './EdgePropertyEditor';
import NodePropertyEditor from './NodePropertyEditor';

interface OverlayControllerProps {
    stateManager: StateManager;
    history: HistoryManager;
    networkService: NetworkService;
    overlayManager: OverlayManager;
    renderAll: () => void;
}

export default function OverlayController({ 
    stateManager, 
    history, 
    networkService, 
    overlayManager, 
    renderAll 
}: OverlayControllerProps) {
    const [activeOverlay, setActiveOverlay] = useState<OverlayType | null>(null);
    const [overlayData, setOverlayData] = useState<any>(null);
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);

    useEffect(() => {
        const unsubscribe = stateEvents.subscribe((event) => {
            if (event.type === 'UI_OVERLAY_CHANGED') {
                if (!stateManager) return;
                const state = stateManager.getState();
                setActiveOverlay(state.ui.activeOverlay);
                setOverlayData(state.ui.overlayData);
                setPosition(state.ui.overlayPosition);
            }
        });
        return () => unsubscribe();
    }, [stateManager]);

    if (!activeOverlay || !stateManager) {
        return null;
    }

    const zIndex = 9000; 
    
    // TRICK: position: fixed is essential for being independent of canvas zoom/pan.
    // The coordinates now include the canvas offset in page.tsx.
    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        top: position?.y || 0,
        left: position?.x || 0,
        zIndex: zIndex,
        pointerEvents: 'auto'
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            stateManager.closeOverlay();
        }
    };

    return (
        <div 
            className="overlay-manager-root" 
            style={{ 
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
                pointerEvents: 'none', zIndex: zIndex - 1 
            }}
            onClick={handleBackdropClick}
        >
            <div style={{ ...containerStyle, pointerEvents: 'auto' }}>
                {activeOverlay === OverlayType.NodeToolbox && (
                    <NodeToolbox node={overlayData} overlayManager={overlayManager} stateManager={stateManager} onClose={() => stateManager.closeOverlay()} renderAll={renderAll} />
                )}
                {activeOverlay === OverlayType.EdgeToolbox && (
                    <EdgeToolbox edge={overlayData} overlayManager={overlayManager} stateManager={stateManager} onClose={() => stateManager.closeOverlay()} renderAll={renderAll} />
                )}
                {activeOverlay === OverlayType.NodeInlineEdit && (
                    <NodeInlineEdit node={overlayData.node} dimensions={overlayData.dimensions} stateManager={stateManager} history={history} onClose={() => stateManager.closeOverlay()} renderAll={renderAll} />
                )}
                {activeOverlay === OverlayType.NodeProperties && (
                    <NodePropertyEditor node={overlayData} overlayManager={overlayManager} stateManager={stateManager} history={history} onClose={() => stateManager.closeOverlay()} renderAll={renderAll} />
                )}
                {activeOverlay === OverlayType.EdgeProperties && (
                    <EdgePropertyEditor edge={overlayData} overlayManager={overlayManager} stateManager={stateManager} history={history} onClose={() => stateManager.closeOverlay()} renderAll={renderAll} />
                )}
                {activeOverlay === OverlayType.ColorPicker && (
                    <ColorPicker node={overlayData} stateManager={stateManager} history={history} onClose={() => stateManager.closeOverlay()} renderAll={renderAll} />
                )}
                {activeOverlay === OverlayType.EdgeWeight && (
                    <EdgeWeightEditor edge={overlayData} stateManager={stateManager} history={history} onClose={() => stateManager.closeOverlay()} renderAll={renderAll} />
                )}
            </div>

            {/* Full-screen modals */}
            {activeOverlay === OverlayType.DataList && (
                <div style={{ pointerEvents: 'auto' }}>
                    <DataListModal mode={overlayData.mode} networkService={networkService} onClose={() => stateManager.closeOverlay()} onSelect={overlayData.onSelect} />
                </div>
            )}
            {activeOverlay === OverlayType.Modal && (
                <div style={{ pointerEvents: 'auto' }}>
                    <GenericModal {...overlayData} onClose={() => stateManager.closeOverlay()} />
                </div>
            )}
        </div>
    );
}
