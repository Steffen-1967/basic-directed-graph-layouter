'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GraphNode, getLangValue, toMultiLang } from '../../manifest';
import { StateManager } from '../../stateManager';
import { HistoryManager } from '../../historyManager';
import { UpdateNodePropertyAction } from '../../actions';

interface NodeInlineEditProps {
    node: GraphNode;
    position: { x: number, y: number };
    dimensions: { width: number, height: number };
    stateManager: StateManager;
    history: HistoryManager;
    onClose: () => void;
    renderAll: () => void;
}

export default function NodeInlineEdit({
    node,
    position,
    dimensions,
    stateManager,
    history,
    onClose,
    renderAll
}: NodeInlineEditProps) {
    const [name, setName] = useState(getLangValue(node.name));
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, []);

    const handleSave = () => {
        const oldNameStr = getLangValue(node.name);
        if (name !== oldNameStr) {
            const action = new UpdateNodePropertyAction(
                stateManager.getState().nodes, 
                node.id, 
                'name', 
                toMultiLang(name), 
                node.name
            );
            history.execute(action, stateManager.getState().envelope!);
            renderAll();
        }
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <textarea
            ref={textareaRef}
            className="node-edit-textarea"
            style={{
                position: 'absolute',
                left: position.x + 'px',
                top: position.y + 'px',
                width: dimensions.width + 'px',
                height: dimensions.height + 'px',
                zIndex: 1100,
                resize: 'none',
                overflow: 'hidden'
            }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
        />
    );
}
