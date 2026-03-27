/**
 * @file renderer.ts
 * Original, optimized rendering logic converted to TypeScript.
 */

import { CONFIG, ScenarioNode, Config } from './manifest.js';
import { NodeHandle } from './state.js';

// Handle rendering constants
const HANDLE_OFFSET = 2;
const CORNER_HANDLE_SIZE = 10;
const ANCHOR_HANDLE_DIAMETER = 10;
const HANDLE_STROKE_COLOR = '#6c75ad';
const HANDLE_STROKE_WIDTH = 2;

export interface BoundingBox {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
}

export interface PathPoint {
    x: number;
    y: number;
}

export interface Edge {
    fromId: string;
    toId: string;
}

/**
 * Calculates the horizontal offset from the bonding box center of a node
 * to its anchor point.
 */
export function calculateHandleOffsetX(node: ScenarioNode, sizes: any, side: string, handleIndex: number): number {
    if (node.type === 'Task') {
        if ((side === `top`) || (side === `bottom`)) {
            if (handleIndex === 1) return -sizes.taskWidth * 0.25;
            else if (handleIndex === 3) return sizes.taskWidth * 0.25;
            return 0;
        }
        else if (side === `left`) return -sizes.taskWidth * 0.5;
        else if (side === `right`) return sizes.taskWidth * 0.5;
    }
    else if (node.type === 'SubProcess') {
        if ((side === `top`) || (side === `bottom`)) {
            if (handleIndex === 1) return -sizes.subProcessWidth * 0.25;
            else if (handleIndex === 3) return sizes.subProcessWidth * 0.25;
            return 0;
        }
        else if (side === `left`) return -sizes.subProcessWidth * 0.5;
        else if (side === `right`) return sizes.subProcessWidth * 0.5;
    }
    else if (node.type === 'Event') {
        if ((side === `top`) || (side === `bottom`)) {
            if (handleIndex === 1) return -sizes.eventSize * sizes.eventHandleShiftOnSize2;
            else if (handleIndex === 3) return sizes.eventSize * sizes.eventHandleShiftOnSize2;
            return 0;
        }
        else if (side === `left`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return -sizes.eventSize * (0.5 - sizes.eventHandleShiftOnSize1);
            return -sizes.eventSize * 0.5;
        }
        else if (side === `right`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return sizes.eventSize * (0.5 - sizes.eventHandleShiftOnSize1);
            return sizes.eventSize * 0.5;
        }
    }
    else if (node.type === 'Rule') {
        if ((side === `top`) || (side === `bottom`)) {
            if (handleIndex === 1) return -sizes.ruleSize * sizes.ruleHandleShiftOnSize2;
            if (handleIndex === 3) return sizes.ruleSize * sizes.ruleHandleShiftOnSize2;
            return 0;
        }
        else if (side === `left`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return -sizes.ruleSize * (0.5 - sizes.ruleHandleShiftOnSize1);
            return -sizes.ruleSize * 0.5;
        }
        else if (side === `right`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return sizes.ruleSize * (0.5 - sizes.ruleHandleShiftOnSize1);
            return sizes.ruleSize * 0.5;
        }
    }
    return 0;
}

/**
 * Calculates the vertical offset from the bonding box center of a node
 * to its anchor point.
 */
export function calculateHandleOffsetY(node: ScenarioNode, sizes: any, side: string, handleIndex: number): number {
    if (node.type === 'Task') {
        if ((side === `left`) || (side === `right`)) {
            if (handleIndex === 1) return -sizes.taskHeight * 0.25;
            else if (handleIndex === 3) return sizes.taskHeight * 0.25;
            return 0;
        }
        else if (side === `top`) return -sizes.taskHeight * 0.5;
        else if (side === `bottom`) return sizes.taskHeight * 0.5;
    }
    else if (node.type === 'SubProcess') {
        if ((side === `left`) || (side === `right`)) {
            if (handleIndex === 1) return -sizes.subProcessHeight * 0.25;
            else if (handleIndex === 3) return sizes.subProcessHeight * 0.25;
            return 0;
        }
        else if (side === `top`) return -sizes.subProcessHeight * 0.5;
        else if (side === `bottom`) return sizes.subProcessHeight * 0.5;
    }
    else if (node.type === 'Event') {
        if ((side === `left`) || (side === `right`)) {
            if (handleIndex === 1) return -sizes.eventSize * sizes.eventHandleShiftOnSize2;
            else if (handleIndex === 3) return sizes.eventSize * sizes.eventHandleShiftOnSize2;
            return 0;
        }
        else if (side === `top`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return -sizes.eventSize * (0.5 - sizes.eventHandleShiftOnSize1);
            return -sizes.eventSize * 0.5;
        }
        else if (side === `bottom`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return sizes.eventSize * (0.5 - sizes.eventHandleShiftOnSize1);
            return sizes.eventSize * 0.5;
        }
    }
    else if (node.type === 'Rule') {
        if ((side === `left`) || (side === `right`)) {
            if (handleIndex === 1) return -sizes.ruleSize * sizes.ruleHandleShiftOnSize1;
            if (handleIndex === 3) return sizes.ruleSize * sizes.ruleHandleShiftOnSize1;
            return 0;
        }
        else if (side === `top`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return -sizes.ruleSize * (0.5 - sizes.ruleHandleShiftOnSize2);
            return -sizes.ruleSize * 0.5;
        }
        else if (side === `bottom`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return sizes.ruleSize * (0.5 - sizes.ruleHandleShiftOnSize2);
            return sizes.ruleSize * 0.5;
        }
    }
    return 0;
}

/**
 * Renders text with automatic word wrapping and optional truncation.
 */
export function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, maxLines: number, colors: any, centered: boolean = false): void {
    ctx.fillStyle = colors.Text;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = centered ? 'middle' : 'top';

    const words = text.split(' ');
    let lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        let width = ctx.measureText(currentLine + " " + words[i]).width;
        if (width < maxWidth) {
            currentLine += " " + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);

    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] += '...';
    }

    const lineHeight = 14;
    let startY = centered ? y - (lines.length - 1) * lineHeight * 0.5 : y;

    lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight));
}

/**
 * Renders a single process node on the canvas based on its type.
 */
export function drawNode(ctx: CanvasRenderingContext2D, node: ScenarioNode, colors: any, sizes: any, isHighlighted: boolean = false, isHovered: boolean = false): void {
    const fillColor = node.overrideFillColor || colors[node.type];
    let strokeColor = node.overrideStrokeColor || colors.Stroke;
    let lineWidth = 2;

    if (isHighlighted) {
        strokeColor = '#007bff';
        lineWidth = 3;
    } else if (isHovered) {
        strokeColor = colors.AnchorHandleHover || '#ADD8E6';
        lineWidth = 3;
    }

    if (node.type === 'Event') {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, sizes.eventSize * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        drawWrappedText(ctx, node.name, node.x!, node.y! + sizes.eventSize * 0.5 + 10, sizes.eventSize * 1.4, 3, colors);
    } else if (node.type === 'Task') {
        const x = node.x! - sizes.taskWidth * 0.5;
        const y = node.y! - sizes.taskHeight * 0.5;
        ctx.beginPath();
        (ctx as any).roundRect(x, y, sizes.taskWidth, sizes.taskHeight, 10);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        drawWrappedText(ctx, node.name, node.x!, node.y!, sizes.taskWidth - 10, 3, colors, true);
    } else if (node.type === 'SubProcess') {
        const x = node.x! - sizes.subProcessWidth * 0.5;
        const y = node.y! - sizes.subProcessHeight * 0.5;
        ctx.beginPath();
        (ctx as any).roundRect(x, y, sizes.subProcessWidth, sizes.subProcessHeight, 10);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isHighlighted || isHovered ? 5 : 4;
        ctx.stroke();

        const squareSize = sizes.subProcessSquareSize;
        const squareX = node.x! - squareSize * 0.5;
        const squareY = y + sizes.subProcessHeight - squareSize - 5;
        ctx.beginPath();
        ctx.rect(squareX, squareY, squareSize, squareSize);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        const plusSize = squareSize * 0.6;
        const centerX = squareX + squareSize * 0.5;
        const centerY = squareY + squareSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(centerX - plusSize * 0.5, centerY);
        ctx.lineTo(centerX + plusSize * 0.5, centerY);
        ctx.moveTo(centerX, centerY - plusSize * 0.5);
        ctx.lineTo(centerX, centerY + plusSize * 0.5);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        drawWrappedText(ctx, node.name, node.x!, node.y!, sizes.subProcessWidth - 10, 3, colors, true);
    } else if (node.type === 'Rule') {
        ctx.beginPath();
        ctx.moveTo(node.x!, node.y! - sizes.ruleSize * 0.5);
        ctx.lineTo(node.x! + sizes.ruleSize * 0.5, node.y!);
        ctx.lineTo(node.x!, node.y! + sizes.ruleSize * 0.5);
        ctx.lineTo(node.x! - sizes.ruleSize * 0.5, node.y!);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        drawWrappedText(ctx, node.name, node.x!, node.y! + sizes.ruleSize * 0.5 + 10, sizes.ruleSize * 1.25, 3, colors);
    }
}

/**
 * Calculates handle index for the source node.
 */
export function calculateSourceHandle(fromNode: ScenarioNode, toNode: ScenarioNode): number {
    if (!fromNode.successors || fromNode.successors.length < 2) return 2;
    if (fromNode.y! > toNode.y!) return 1;
    if (fromNode.y! < toNode.y!) return 3;
    return 2;
}

/**
 * Calculates handle index for the target node.
 */
export function calculateTargetHandle(fromNode: ScenarioNode, toNode: ScenarioNode): number {
    if (!toNode.predecessors || toNode.predecessors.length < 2) return 2;
    if (fromNode.y! < toNode.y!) return 1;
    if (fromNode.y! > toNode.y!) return 3;
    return 2;
}

/**
 * Calculates the points of the routed path between two nodes.
 */
export function calculateArrowPath(fromNode: ScenarioNode, toNode: ScenarioNode, sizes: any, lvlW: number, rowH: number): PathPoint[] {
    const sourceHandle = calculateSourceHandle(fromNode, toNode);
    const startY1 = fromNode.y! + calculateHandleOffsetY(fromNode, sizes, `right`, sourceHandle);
    const startX1 = fromNode.x! + calculateHandleOffsetX(fromNode, sizes, `right`, sourceHandle);

    const targetHandle = calculateTargetHandle(fromNode, toNode);
    const endY2 = toNode.y! + calculateHandleOffsetY(toNode, sizes, `left`, targetHandle);
    const endX2 = toNode.x! + calculateHandleOffsetX(toNode, sizes, `left`, targetHandle);

    const path: PathPoint[] = [{ x: startX1, y: startY1 }];

    if (startX1 <= endX2) {
        if (Math.abs(startY1 - endY2) < 0.1) {
            // Straight horizontal line
        } else {
            const midX = (fromNode.x! + toNode.x!) * 0.5;
            path.push({ x: midX, y: startY1 });
            path.push({ x: midX, y: endY2 });
        }
    } else {
        const detourX1 = fromNode.x! + lvlW * 0.5;
        const detourY = fromNode.isTopRow ? (startY1 - rowH * 0.8) : (startY1 + rowH * 0.8);
        const detourX2 = toNode.x! - lvlW * 0.5;

        path.push({ x: detourX1, y: startY1 });
        path.push({ x: detourX1, y: detourY });
        path.push({ x: detourX2, y: detourY });
        path.push({ x: detourX2, y: endY2 });
    }

    path.push({ x: endX2, y: endY2 });
    return path;
}

/**
 * Calculates the points of the routed path between two nodes in a tree layout.
 */
export function calculateTreePath(fromNode: ScenarioNode, toNode: ScenarioNode, sizes: any, switchToListLevel: number): PathPoint[] {
    const fromBbox = calculateNodeBoundingBox(fromNode, sizes);
    const toBbox = calculateNodeBoundingBox(toNode, sizes);

    if ((fromNode.level || 0) < switchToListLevel) {
        // Tree style: Bottom center to Top center
        const startX = fromNode.x!;
        const startY = fromBbox.maxY;
        const endX = toNode.x!;
        const endY = toBbox.minY;

        const midY = (startY + endY) * 0.5;
        return [
            { x: startX, y: startY },
            { x: startX, y: midY },
            { x: endX, y: midY },
            { x: endX, y: endY }
        ];
    } else {
        // List style: 25% bottom to Left center
        const startX = fromBbox.minX + (fromBbox.width * 0.25);
        const startY = fromBbox.maxY;
        const endX = toBbox.minX;
        const endY = toNode.y!;

        return [
            { x: startX, y: startY },
            { x: startX, y: endY },
            { x: endX, y: endY }
        ];
    }
}

/**
 * Draws a routed arrow connection between two nodes.
 */
export function drawUnifiedArrow(ctx: CanvasRenderingContext2D, fromNode: ScenarioNode, toNode: ScenarioNode, sizes: any, colors: any, lvlW: number, rowH: number, isHovered: boolean = false, isSelected: boolean = false, layoutType: string = 'flow', switchToListLevel: number = 99): void {
    const path = (layoutType === 'tree') 
        ? calculateTreePath(fromNode, toNode, sizes, switchToListLevel)
        : calculateArrowPath(fromNode, toNode, sizes, lvlW, rowH);
    
    const headLength = 10;
    const endPoint = path[path.length - 1];

    ctx.beginPath();
    if (isSelected) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 3;
    } else if (isHovered) {
        ctx.strokeStyle = colors.AnchorHandleHover || '#ADD8E6';
        ctx.lineWidth = 3;
    } else {
        ctx.strokeStyle = colors.Arrow;
        ctx.lineWidth = 2;
    }

    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(endPoint.x, endPoint.y);
    
    // Determine arrow head direction based on last segment
    const lastPoint = path[path.length - 1];
    const prevPoint = path[path.length - 2];
    const angle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);
    
    ctx.save();
    ctx.translate(endPoint.x, endPoint.y);
    ctx.rotate(angle);
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, -headLength * 0.5);
    ctx.lineTo(-headLength, headLength * 0.5);
    ctx.closePath();
    ctx.restore();

    if (isSelected) {
        ctx.fillStyle = '#007bff';
    } else if (isHovered) {
        ctx.fillStyle = colors.AnchorHandleHover || '#ADD8E6';
    } else {
        ctx.fillStyle = colors.Arrow;
    }
    ctx.fill();
}

/**
 * Draws circle handles at each point of an edge path.
 */
export function drawEdgeHandles(ctx: CanvasRenderingContext2D, path: PathPoint[], colors: any, hoveredAnchorIndex: number | null = null): void {
    path.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, ANCHOR_HANDLE_DIAMETER * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = (hoveredAnchorIndex === index) ? colors.AnchorHandleHover : colors.AnchorHandle;
        ctx.fill();
        ctx.strokeStyle = HANDLE_STROKE_COLOR;
        ctx.lineWidth = HANDLE_STROKE_WIDTH * 0.75;
        ctx.stroke();
    });
}

/**
 * Main rendering function.
 */
export function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, offsetX: number, offsetY: number, nodes: ScenarioNode[], sizes: any, colors: any, lvlW: number, rowH: number, isEditable: boolean, hoveredEdge: Edge | null = null, selectedEdge: Edge | null = null, hoveredNode: ScenarioNode | null = null, selectedNode: ScenarioNode | null = null, layoutType: string = 'flow', switchToListLevel: number = 99): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(offsetX, offsetY);

    nodes.forEach(node => {
        if (node.predecessors) {
            node.predecessors.forEach(predEntry => {
                const predId = predEntry.id;
                const predNode = nodes.find(n => n.id === predId);
                if (predNode) {
                    const isHovered = isEditable && hoveredEdge && hoveredEdge.fromId === predId && hoveredEdge.toId === node.id;
                    const isSelected = isEditable && selectedEdge && selectedEdge.fromId === predId && selectedEdge.toId === node.id;
                    drawUnifiedArrow(ctx, predNode, node, sizes, colors, lvlW, rowH, isHovered as boolean, isSelected as boolean, layoutType, switchToListLevel);
                }
            });
        }
    });

    nodes.forEach(node => {
        const isHighlighted = isEditable && selectedNode && selectedNode.id === node.id;
        const isHovered = isEditable && hoveredNode && hoveredNode.id === node.id;
        drawNode(ctx, node, colors, sizes, isHighlighted as boolean, isHovered as boolean);
    });
}

/**
 * Calculates the bounding box for a node.
 */
export function calculateNodeBoundingBox(node: ScenarioNode, sizes: any): BoundingBox {
    let minX, maxX, minY, maxY;

    if (node.type === 'Event') {
        const radius = sizes.eventSize * 0.5;
        minX = node.x! - radius;
        maxX = node.x! + radius;
        minY = node.y! - radius;
        maxY = node.y! + radius;
    } else if (node.type === 'Task') {
        minX = node.x! - sizes.taskWidth * 0.5;
        maxX = node.x! + sizes.taskWidth * 0.5;
        minY = node.y! - sizes.taskHeight * 0.5;
        maxY = node.y! + sizes.taskHeight * 0.5;
    } else if (node.type === 'SubProcess') {
        minX = node.x! - sizes.subProcessWidth * 0.5;
        maxX = node.x! + sizes.subProcessWidth * 0.5;
        minY = node.y! - sizes.subProcessHeight * 0.5;
        maxY = node.y! + sizes.subProcessHeight * 0.5;
    } else if (node.type === 'Rule') {
        minX = node.x! - sizes.ruleSize * 0.5;
        maxX = node.x! + sizes.ruleSize * 0.5;
        minY = node.y! - sizes.ruleSize * 0.5;
        maxY = node.y! + sizes.ruleSize * 0.5;
    } else {
        minX = node.x!;
        maxX = node.x!;
        minY = node.y!;
        maxY = node.y!;
    }

    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Draws corner handles.
 */
export function drawCornerHandles(ctx: CanvasRenderingContext2D, bbox: BoundingBox): void {
    const offset = HANDLE_OFFSET;
    const size = CORNER_HANDLE_SIZE;

    ctx.strokeStyle = HANDLE_STROKE_COLOR;
    ctx.lineWidth = HANDLE_STROKE_WIDTH * 2;

    const corners = [
        { x: bbox.minX - offset, y: bbox.minY - offset, dx: size, dy: size },
        { x: bbox.maxX + offset, y: bbox.minY - offset, dx: -size, dy: size },
        { x: bbox.minX - offset, y: bbox.maxY + offset, dx: size, dy: -size },
        { x: bbox.maxX + offset, y: bbox.maxY + offset, dx: -size, dy: -size }
    ];

    corners.forEach(c => {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y + c.dy);
        ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.dx, c.y);
        ctx.stroke();
    });
}

/**
 * Calculates anchor handles.
 */
export function calculateAnchorHandles(bbox: BoundingBox, nodeType: string, centerX: number, centerY: number, sizes: any): Record<string, PathPoint> {
    const anchors: Record<string, PathPoint> = {};
    const offset = HANDLE_OFFSET * 2;
    const { width, height } = bbox;

    const eventHandleShiftAnchor1 = 0.99;
    const eventHandleShiftAnchor2 = 0.75;
    const ruleHandleShiftAnchor1 = 0.99;
    const ruleHandleShiftAnchor2 = 0.75;

    // Top edge - 3 anchors
    for (let handleIndex = 1; handleIndex <= 3; handleIndex++) {
        let x = bbox.minX + (width * handleIndex / 4);
        let y = bbox.minY - offset;

        if ((nodeType === 'Event' || nodeType === 'Rule') && (handleIndex === 1 || handleIndex === 3)) {
            if (nodeType === 'Event') {
                y = bbox.minY + (height * sizes.eventHandleShiftOnSize1) - (offset * eventHandleShiftAnchor1);
                if (handleIndex === 1) x = bbox.minX + (width * sizes.eventHandleShiftOnSize2) - (offset * eventHandleShiftAnchor2);
                else if (handleIndex === 3) x = bbox.maxX - (width * sizes.eventHandleShiftOnSize2) + (offset * eventHandleShiftAnchor2);
            }
            else if (nodeType === 'Rule') {
                y = bbox.minY + (height * sizes.ruleHandleShiftOnSize1) - (offset * ruleHandleShiftAnchor1);
                if (handleIndex === 1) x = bbox.minX + (width * sizes.ruleHandleShiftOnSize2) - (offset * ruleHandleShiftAnchor2);
                else if (handleIndex === 3) x = bbox.maxX - (width * sizes.ruleHandleShiftOnSize2) + (offset * ruleHandleShiftAnchor2);
            }
        }
        anchors[`top-${handleIndex}`] = { x, y };
    }

    // Bottom edge - 3 anchors
    for (let handleIndex = 1; handleIndex <= 3; handleIndex++) {
        let x = bbox.minX + (width * handleIndex / 4);
        let y = bbox.maxY + offset;

        if ((nodeType === 'Event' || nodeType === 'Rule') && (handleIndex === 1 || handleIndex === 3)) {
            if (nodeType === 'Event') {
                y = bbox.maxY - (height * sizes.eventHandleShiftOnSize1) + (offset * eventHandleShiftAnchor1);
                if (handleIndex === 1) x = bbox.minX + (width * sizes.eventHandleShiftOnSize2) - (offset * eventHandleShiftAnchor2);
                else if (handleIndex === 3) x = bbox.maxX - (width * sizes.eventHandleShiftOnSize2) + (offset * eventHandleShiftAnchor2);
            }
            else if (nodeType === 'Rule') {
                y = bbox.maxY - (height * sizes.ruleHandleShiftOnSize1) + (offset * ruleHandleShiftAnchor1);
                if (handleIndex === 1) x = bbox.minX + (width * sizes.ruleHandleShiftOnSize2) - (offset * ruleHandleShiftAnchor2);
                else if (handleIndex === 3) x = bbox.maxX - (width * sizes.ruleHandleShiftOnSize2) + (offset * ruleHandleShiftAnchor2);
            }
        }
        anchors[`bottom-${handleIndex}`] = { x, y };
    }

    // Left edge - 3 anchors
    for (let handleIndex = 1; handleIndex <= 3; handleIndex++) {
        let x = bbox.minX - offset;
        let y = bbox.minY + (height * handleIndex / 4);

        if ((nodeType === 'Event' || nodeType === 'Rule') && (handleIndex === 1 || handleIndex === 3)) {
            if (nodeType === 'Event') {
                x = bbox.minX + (width * sizes.eventHandleShiftOnSize1) - (offset * eventHandleShiftAnchor1);
                if (handleIndex === 1) y = bbox.minY + (height * sizes.eventHandleShiftOnSize2) - (offset * eventHandleShiftAnchor2);
                else if (handleIndex === 3) y = bbox.maxY - (height * sizes.eventHandleShiftOnSize2) + (offset * eventHandleShiftAnchor2);
            }
            else if (nodeType === 'Rule') {
                x = bbox.minX + (width * sizes.ruleHandleShiftOnSize1) - (offset * ruleHandleShiftAnchor1);
                if (handleIndex === 1) y = bbox.minY + (height * sizes.ruleHandleShiftOnSize2) - (offset * ruleHandleShiftAnchor2);
                else if (handleIndex === 3) y = bbox.maxY - (height * sizes.ruleHandleShiftOnSize2) + (offset * ruleHandleShiftAnchor2);
            }
        }
        anchors[`left-${handleIndex}`] = { x, y };
    }

    // Right edge - 3 anchors
    for (let handleIndex = 1; handleIndex <= 3; handleIndex++) {
        let x = bbox.maxX + offset;
        let y = bbox.minY + (height * handleIndex / 4);

        if ((nodeType === 'Event' || nodeType === 'Rule') && (handleIndex === 1 || handleIndex === 3)) {
            if (nodeType === 'Event') {
                x = bbox.maxX - (width * sizes.eventHandleShiftOnSize1) + (offset * eventHandleShiftAnchor1);
                if (handleIndex === 1) y = bbox.minY + (height * sizes.eventHandleShiftOnSize2) - (offset * eventHandleShiftAnchor2);
                else if (handleIndex === 3) y = bbox.maxY - (height * sizes.eventHandleShiftOnSize2) + (offset * eventHandleShiftAnchor2);
            }
            else if (nodeType === 'Rule') {
                x = bbox.maxX - (width * sizes.ruleHandleShiftOnSize1) + (offset * ruleHandleShiftAnchor1);
                if (handleIndex === 1) y = bbox.minY + (height * sizes.ruleHandleShiftOnSize2) - (offset * ruleHandleShiftAnchor2);
                else if (handleIndex === 3) y = bbox.maxY - (height * sizes.ruleHandleShiftOnSize2) + (offset * ruleHandleShiftAnchor2);
            }
       }
        anchors[`right-${handleIndex}`] = { x, y };
    }

    return anchors;
}

/**
 * Draws anchor handles.
 */
export function drawAnchorHandles(ctx: CanvasRenderingContext2D, bbox: BoundingBox, nodeType: string, centerX: number, centerY: number, sizes: any, colors: any, hoveredHandle: NodeHandle | null = null): void {
    const anchors = calculateAnchorHandles(bbox, nodeType, centerX, centerY, sizes);
    Object.entries(anchors).forEach(([key, anchor]) => {
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, ANCHOR_HANDLE_DIAMETER * 0.5, 0, 2 * Math.PI);
        
        // Check if this handle matches the hovered one
        const isHovered = hoveredHandle && key === `${hoveredHandle.side}-${hoveredHandle.index}`;
        ctx.fillStyle = isHovered ? colors.AnchorHandleHover : colors.AnchorHandle;
        ctx.fill();
        ctx.strokeStyle = HANDLE_STROKE_COLOR;
        ctx.lineWidth = HANDLE_STROKE_WIDTH * 0.75;
        ctx.stroke();
    });
}

/**
 * Draws selection handles.
 */
export function drawNodeHandles(ctx: CanvasRenderingContext2D, node: ScenarioNode, sizes: any, colors: any, hoveredHandle: NodeHandle | null = null): void {
    const bbox = calculateNodeBoundingBox(node, sizes);
    drawCornerHandles(ctx, bbox);
    drawAnchorHandles(ctx, bbox, node.type, node.x!, node.y!, sizes, colors, hoveredHandle);
}

// Global exposure for browser (legacy)
if (typeof window !== 'undefined') {
    const exports = { calculateHandleOffsetX, drawWrappedText, drawNode, drawUnifiedArrow, render, calculateNodeBoundingBox, calculateAnchorHandles, drawNodeHandles, calculateSourceHandle, calculateTargetHandle, calculateArrowPath, calculateTreePath, drawEdgeHandles };
    Object.assign(window, exports);
}
