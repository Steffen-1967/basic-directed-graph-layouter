'use client';

import React from 'react';
import { GraphNode, getLangValue, RENDER_CONFIG, LayoutType, NodeType } from '../manifest';
import { MarkdownEngine } from '../markdown';

interface TaskListProps {
    nodes: GraphNode[];
    selectedNode: GraphNode | null;
    onNodeClick: (node: GraphNode, event: React.MouseEvent) => void;
}

/**
 * TaskList component renders the process nodes in a table format.
 * Replaces direct DOM manipulation for TaskList layout.
 */
export default function TaskList({ nodes, selectedNode, onNodeClick }: TaskListProps) {
    return (
        <div className="task-list-wrapper">
            <table className="task-list-table">
                <thead>
                    <tr>
                        <th className="col-symbol">Symbol</th>
                        <th className="col-name">Name</th>
                        <th className="col-description">Beschreibung</th>
                    </tr>
                </thead>
                <tbody>
                    {nodes.map((node) => (
                        <TaskRow 
                            key={node.id} 
                            node={node} 
                            isSelected={selectedNode?.id === node.id}
                            onNodeClick={onNodeClick}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface TaskRowProps {
    node: GraphNode;
    isSelected: boolean;
    onNodeClick: (node: GraphNode, event: React.MouseEvent) => void;
}

function TaskRow({ node, isSelected, onNodeClick }: TaskRowProps) {
    const name = getLangValue(node.name);
    const description = getLangValue(node.description);
    const descHtml = description ? MarkdownEngine.render(description) : '';

    return (
        <tr 
            className={`task-list-row ${isSelected ? 'selected' : ''}`}
            onClick={(e) => onNodeClick(node, e)}
        >
            <td className="col-symbol">
                <TaskSymbol node={node} />
            </td>
            <td className="col-name">{name}</td>
            <td className="col-description">
                <div dangerouslySetInnerHTML={{ __html: descHtml }} />
            </td>
        </tr>
    );
}

function TaskSymbol({ node }: { node: GraphNode }) {
    const shapeDef = RENDER_CONFIG.shapes.TaskList[node.type] || { shape: 'roundedRect', Width: 55, Height: 32.5 };
    const width = 40;
    const height = 40;
    const symbolWidth = shapeDef.Width;
    const symbolHeight = shapeDef.Height;
    const shape = shapeDef.shape;
    
    const fillColor = node.overrideFillColor || RENDER_CONFIG.colors[node.type] || '#eee';
    const strokeColor = RENDER_CONFIG.colors.Stroke || '#495057';

    const cx = width / 2;
    const cy = height / 2;

    return (
        <svg width={width} height={height} className="task-symbol-svg">
            {shape === 'circle' ? (
                <circle cx={cx} cy={cy} r={symbolWidth / 2} fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
            ) : shape === 'diamond' ? (
                <path 
                    d={`M ${cx} ${cy - symbolHeight / 2} L ${cx + symbolWidth / 2} ${cy} L ${cx} ${cy + symbolHeight / 2} L ${cx - symbolWidth / 2} ${cy} Z`} 
                    fill={fillColor} 
                    stroke={strokeColor} 
                    strokeWidth="1.5" 
                />
            ) : (
                <g>
                    <rect 
                        x={cx - symbolWidth / 2} 
                        y={cy - symbolHeight / 2} 
                        width={symbolWidth} 
                        height={symbolHeight} 
                        rx="5" 
                        ry="5" 
                        fill={fillColor} 
                        stroke={strokeColor} 
                        strokeWidth="1.5" 
                    />
                    {node.type === NodeType.SubProcess && (
                        <g transform={`translate(${cx}, ${cy + symbolHeight / 2 - 4})`}>
                            <rect x="-2.5" y="-2.5" width="5" height="5" fill="none" stroke={strokeColor} strokeWidth="1" />
                            <line x1="-1.5" y1="0" x2="1.5" y2="0" stroke={strokeColor} strokeWidth="1" />
                            <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke={strokeColor} strokeWidth="1" />
                        </g>
                    )}
                </g>
            )}
        </svg>
    );
}
