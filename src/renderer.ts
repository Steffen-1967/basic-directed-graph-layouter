/**
 * @file renderer.ts
 * Original, optimized rendering logic converted to TypeScript.
 */

import { RENDER_CONFIG, GraphNode, GraphEdge, EdgeType, NodeType, LayoutType, EvaluationType, MultiLangProp, getLangValue, NodeShape, NodeShapeDefinition } from './manifest';
import { NodeHandle } from './state';
import { Point, Rect, NodeGeometry, EdgeGeometry } from './geometry';

// Handle rendering constants
const HANDLE_OFFSET = 2;
const CORNER_HANDLE_SIZE = 10;
const ANCHOR_HANDLE_DIAMETER = 10;
const HANDLE_STROKE_COLOR = '#6c75ad';
const HANDLE_STROKE_WIDTH = 2;

/**
 * Pure Drawing Engine. Only deals with Canvas Context and Geometry data.
 */
export class CanvasRenderer {
    static renderNode(ctx: CanvasRenderingContext2D, geo: NodeGeometry, colors: any, isHighlighted: boolean, isHovered: boolean) {
        const fillColor = colors[geo.type] || colors['default'] || '#eee';
        let strokeColor = colors.Stroke || '#495057';
        let lineWidth = 2;

        if (isHighlighted) { strokeColor = '#007bff'; lineWidth = 3; }
        else if (isHovered) { strokeColor = colors.AnchorHandleHover || '#ADD8E6'; lineWidth = 3; }

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;

        const { x, y, width, height } = geo.boundingBox;

        ctx.beginPath();
        if (geo.shape === 'circle') {
            ctx.arc(geo.center.x, geo.center.y, width * 0.5, 0, 2 * Math.PI);
        } else if (geo.shape === 'diamond') {
            const cx = geo.center.x, cy = geo.center.y, hw = width * 0.5, hh = height * 0.5;
            ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath();
        } else if (geo.shape === 'rect') {
            ctx.rect(x, y, width, height);
        } else {
            (ctx as any).roundRect(x, y, width, height, 10);
        }
        ctx.fill(); ctx.stroke();

        // Render Text
        ctx.fillStyle = colors.Text || '#212529';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lineHeight = 14;
        geo.textLines.forEach((line, i) => {
            const lineY = geo.textCenter.y + (i - (geo.textLines.length - 1) * 0.5) * lineHeight;
            ctx.fillText(line, geo.textCenter.x, lineY);
        });
    }

    static renderEdge(ctx: CanvasRenderingContext2D, geo: EdgeGeometry, color: string, isHighlighted: boolean) {
        ctx.beginPath();
        ctx.lineWidth = isHighlighted ? 3 : 2;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (geo.isQuadratic && geo.controlPoint) {
            ctx.moveTo(geo.path[0].x, geo.path[0].y);
            ctx.quadraticCurveTo(geo.controlPoint.x, geo.controlPoint.y, geo.path[geo.path.length-1].x, geo.path[geo.path.length-1].y);
        } else {
            ctx.moveTo(geo.path[0].x, geo.path[0].y);
            for (let i = 1; i < geo.path.length; i++) ctx.lineTo(geo.path[i].x, geo.path[i].y);
        }
        ctx.stroke();

        // Arrow Head
        const end = geo.path[geo.path.length-1];
        ctx.beginPath(); ctx.fillStyle = color; ctx.save();
        ctx.translate(end.x, end.y); ctx.rotate(geo.arrowAngle);
        ctx.moveTo(0, 0); ctx.lineTo(-10, -2.5); ctx.lineTo(-10, 2.5); ctx.closePath();
        ctx.restore(); ctx.fill();

        // Label
        if (geo.labelText && geo.labelPosition) {
            ctx.font = '10px sans-serif';
            const m = ctx.measureText(geo.labelText);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(geo.labelPosition.x - m.width/2 - 2, geo.labelPosition.y - 7, m.width + 4, 14);
            ctx.fillStyle = '#212529'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(geo.labelText, geo.labelPosition.x, geo.labelPosition.y);
        }
    }
}

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
 * Gets the dimensions and shape for a node based on current layout.
 */
export function getNodeDimensions(node: GraphNode, layoutType: string = LayoutType.Flow): { width: number; height: number; shape: NodeShape } {
    let layoutShapes = (RENDER_CONFIG.shapes as any)[layoutType] || RENDER_CONFIG.shapes.Flow;
    let shapeDef: NodeShapeDefinition = layoutShapes[node.type];
    
    // Fallback to Flow layout if specific layout doesn't have this node type
    if (!shapeDef && layoutType !== LayoutType.Flow) {
        shapeDef = RENDER_CONFIG.shapes.Flow[node.type];
    }
    
    // Final fallback
    if (!shapeDef) {
        shapeDef = { shape: 'roundedRect', Width: 110, Height: 65 };
    }
    
    if (typeof shapeDef === 'string') {
        return { width: 110, height: 65, shape: shapeDef as NodeShape };
    }
    
    return {
        width: shapeDef.Width,
        height: shapeDef.Height,
        shape: shapeDef.shape
    };
}

/**
 * Calculates the horizontal offset from the bonding box center of a node
 * to its anchor point.
 */
export function calculateHandleOffsetX(node: GraphNode, side: string, handleIndex: number, layoutType: string = LayoutType.Flow): number {
    const { width, height, shape } = getNodeDimensions(node, layoutType);
    
    if (shape === 'roundedRect' || shape === 'rect' || shape === 'roundedRectWithBox' || shape === 'roundedRectWithEvaluators') {
        if ((side === `top`) || (side === `bottom`)) {
            if (handleIndex === 1) return -width * 0.25;
            else if (handleIndex === 3) return width * 0.25;
            return 0;
        }
        else if (side === `left`) return -width * 0.5;
        else if (side === `right`) return width * 0.5;
    }
    else if (shape === 'circle') {
        const shift1 = 0.07; 
        const shift2 = 0.27;
        if ((side === `top`) || (side === `bottom`)) {
            if (handleIndex === 1) return -width * shift2;
            else if (handleIndex === 3) return width * shift2;
            return 0;
        }
        else if (side === `left`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return -width * (0.5 - shift1);
            return -width * 0.5;
        }
        else if (side === `right`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return width * (0.5 - shift1);
            return width * 0.5;
        }
    }
    else if (shape === 'diamond') {
        const shift1 = 0.17; 
        const shift2 = 0.34;
        if ((side === `top`) || (side === `bottom`)) {
            if (handleIndex === 1) return -width * shift2;
            if (handleIndex === 3) return width * shift2;
            return 0;
        }
        else if (side === `left`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return -width * (0.5 - shift1);
            return -width * 0.5;
        }
        else if (side === `right`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return width * (0.5 - shift1);
            return width * 0.5;
        }
    }
    return 0;
}

/**
 * Calculates the vertical offset from the bonding box center of a node
 * to its anchor point.
 */
export function calculateHandleOffsetY(node: GraphNode, side: string, handleIndex: number, layoutType: string = LayoutType.Flow): number {
    const { width, height, shape } = getNodeDimensions(node, layoutType);

    if (shape === 'roundedRect' || shape === 'rect' || shape === 'roundedRectWithBox' || shape === 'roundedRectWithEvaluators') {
        if ((side === `left`) || (side === `right`)) {
            if (handleIndex === 1) return -height * 0.25;
            else if (handleIndex === 3) return height * 0.25;
            return 0;
        }
        else if (side === `top`) return -height * 0.5;
        else if (side === `bottom`) return height * 0.5;
    }
    else if (shape === 'circle') {
        const shift1 = 0.07; 
        const shift2 = 0.27;
        if ((side === `left`) || (side === `right`)) {
            if (handleIndex === 1) return -height * shift2;
            else if (handleIndex === 3) return height * shift2;
            return 0;
        }
        else if (side === `top`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return -height * (0.5 - shift1);
            return -height * 0.5;
        }
        else if (side === `bottom`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return height * (0.5 - shift1);
            return height * 0.5;
        }
    }
    else if (shape === 'diamond') {
        const shift1 = 0.17;
        const shift2 = 0.34;
        if ((side === `left`) || (side === `right`)) {
            if (handleIndex === 1) return -height * shift1;
            if (handleIndex === 3) return height * shift1;
            return 0;
        }
        else if (side === `top`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return -height * (0.5 - shift2);
            return -height * 0.5;
        }
        else if (side === `bottom`) {
            if ((handleIndex === 1) || (handleIndex === 3)) return height * (0.5 - shift2);
            return height * 0.5;
        }
    }
    return 0;
}

/**
 * Renders text with automatic word wrapping and optional truncation.
 */
export function drawWrappedText(ctx: CanvasRenderingContext2D, textProp: MultiLangProp, x: number, y: number, maxWidth: number, maxLines: number, colors: any, centered: boolean = false): void {
    const text = getLangValue(textProp);

    ctx.fillStyle = colors.Text;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = centered ? 'middle' : 'top';

    const segments: string[] = [];
    let currentSegment = "";
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        currentSegment += char;
        const isSpace = char === ' ';
        const isHyphen = char === '-';
        const isTrueHyphen = isHyphen && i > 0 && i < text.length - 1 && /\S/.test(text[i-1]) && /\S/.test(text[i+1]);
        if (isSpace || isTrueHyphen) {
            segments.push(currentSegment);
            currentSegment = "";
        }
    }
    if (currentSegment) segments.push(currentSegment);

    let lines: string[] = [];
    let currentLine = "";
    for (const segment of segments) {
        if (currentLine === "") {
            const trimmed = segment.trimStart();
            if (trimmed.length > 0) currentLine = trimmed;
            continue;
        }
        const testLine = currentLine + segment;
        if (ctx.measureText(testLine.trimEnd()).width <= maxWidth) {
            currentLine += segment;
        } else {
            lines.push(currentLine.trimEnd());
            currentLine = segment.trimStart();
        }
    }
    if (currentLine.trimEnd().length > 0) lines.push(currentLine.trimEnd());

    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        let lastLine = lines[maxLines - 1];
        lines[maxLines - 1] = lastLine.length > 3 ? lastLine.substring(0, lastLine.length - 3) + '...' : lastLine + '...';
    }

    const lineHeight = 14;
    let startY = centered ? y - (lines.length - 1) * lineHeight * 0.5 : y;
    lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight));
}

/**
 * Renders the graphical representation (symbol) of a node without text.
 */
export function drawNodeSymbol(ctx: CanvasRenderingContext2D, node: GraphNode, x: number, y: number, colors: any, isHighlighted: boolean = false, isHovered: boolean = false, layoutType: string = LayoutType.Flow): void {
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

    const { width, height, shape } = getNodeDimensions(node, layoutType);

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    if (shape === 'circle' || layoutType === LayoutType.ForceAtlas) {
        const radius = (layoutType === LayoutType.ForceAtlas ? 25 : width * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    } else if (shape === 'diamond') {
        const hw = width * 0.5;
        const hh = height * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y - hh);
        ctx.lineTo(x + hw, y);
        ctx.lineTo(x, y + hh);
        ctx.lineTo(x - hw, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (shape === 'rect' || shape === 'roundedRect' || shape === 'roundedRectWithBox' || shape === 'roundedRectWithEvaluators') {
        const rectW = width;
        const rectH = height;
        const rectX = x - rectW * 0.5;
        const rectY = y - rectH * 0.5;
        
        ctx.beginPath();
        if (shape === 'rect') ctx.rect(rectX, rectY, rectW, rectH);
        else (ctx as any).roundRect(rectX, rectY, rectW, rectH, 10);
        ctx.fill();
        if (shape === 'roundedRectWithBox' || shape === 'roundedRectWithEvaluators') ctx.lineWidth = isHighlighted || isHovered ? 5 : 4;
        ctx.stroke();

        if (shape === 'roundedRectWithBox') {
            const squareSize = 12;
            const squareX = x - squareSize * 0.5;
            const squareY = rectY + rectH - squareSize - 5;
            ctx.beginPath();
            ctx.rect(squareX, squareY, squareSize, squareSize);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            const plusSize = squareSize * 0.6;
            const centerX = squareX + squareSize * 0.5;
            const centerY = squareY + squareSize * 0.5;
            ctx.beginPath();
            ctx.moveTo(centerX - plusSize * 0.5, centerY); ctx.lineTo(centerX + plusSize * 0.5, centerY);
            ctx.moveTo(centerX, centerY - plusSize * 0.5); ctx.lineTo(centerX, centerY + plusSize * 0.5);
            ctx.strokeStyle = strokeColor; ctx.lineWidth = 1.5; ctx.stroke();
        }

        if (shape === 'roundedRectWithEvaluators') {
            ctx.save();
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = colors.Stroke || '#495057';
            const drawEvalIcon = (type: EvaluationType, posX: number, posY: number, align: 'left' | 'right') => {
                let symbol = ''; let subSymbol = '';
                switch (type) {
                    case EvaluationType.Event: symbol = '○'; break;
                    case EvaluationType.SingleAnd: symbol = '&'; break;
                    case EvaluationType.MultipleAnd: symbol = '&'; subSymbol = '+'; break;
                    case EvaluationType.SingleOr: symbol = '1'; break;
                    case EvaluationType.MultipleOr: symbol = '≥1'; break;
                }
                ctx.textAlign = align;
                ctx.fillText(symbol, posX, posY);
                if (subSymbol) {
                    ctx.font = 'bold 8px Arial';
                    const metrics = ctx.measureText(symbol);
                    ctx.fillText(subSymbol, align === 'left' ? posX + metrics.width : posX, posY - 5);
                    ctx.font = 'bold 12px Arial';
                }
            };
            if (node._incomingEvaluation) drawEvalIcon(node._incomingEvaluation, rectX, rectY - 5, 'left');
            if (node._outgoingEvaluation) drawEvalIcon(node._outgoingEvaluation, rectX + rectW, rectY + rectH + 12, 'right');
            ctx.restore();
        }
    } else if (shape === 'icon') {
        const size = width || 24;
        const iconX = x - size * 0.5;
        const iconY = y - size * 0.5;
        ctx.beginPath();
        (ctx as any).roundRect(iconX, iconY, size, size, 4);
        ctx.fill();
        ctx.stroke();
    }
}

/**
 * Renders a single process node on the canvas.
 */
export function drawNode(ctx: CanvasRenderingContext2D, node: GraphNode, colors: any, isHighlighted: boolean = false, isHovered: boolean = false, layoutType: string = LayoutType.Flow): void {
    drawNodeSymbol(ctx, node, node._x!, node._y!, colors, isHighlighted, isHovered, layoutType);
    const { width, height, shape } = getNodeDimensions(node, layoutType);

    if (shape === 'circle' || layoutType === LayoutType.ForceAtlas) {
        const radius = (layoutType === LayoutType.ForceAtlas ? 25 : width * 0.5);
        if (layoutType === LayoutType.ForceAtlas) drawWrappedText(ctx, node.name, node._x!, node._y!, radius * 1.8, 3, colors, true);
        else drawWrappedText(ctx, node.name, node._x!, node._y! + radius + 10, radius * 2.8, 3, colors);        
    } else if (shape === 'diamond') {
        const size = width * 0.5;
        drawWrappedText(ctx, node.name, node._x!, node._y! + size + 10, size * 2.5, 3, colors);
    } else if (shape === 'rect' || shape === 'roundedRect' || shape === 'roundedRectWithBox' || shape === 'roundedRectWithEvaluators') {
        drawWrappedText(ctx, node.name, node._x!, node._y!, width - 10, 3, colors, true);
    } else if (shape === 'icon') {
        const size = width || 24;
        ctx.textAlign = 'left';
        drawWrappedText(ctx, node.name, node._x! + size * 0.8, node._y!, 200, 1, colors, true);
    }
}

export function calculateSourceHandle(fromNode: GraphNode, toNode: GraphNode): number {
    if (!fromNode._successorsCalculated || fromNode._successorsCalculated.length < 2) return 2;
    return fromNode._y! > toNode._y! ? 1 : (fromNode._y! < toNode._y! ? 3 : 2);
}

export function calculateTargetHandle(fromNode: GraphNode, toNode: GraphNode): number {
    if (!toNode._predecessorsCalculated || toNode._predecessorsCalculated.length < 2) return 2;
    return fromNode._y! < toNode._y! ? 1 : (fromNode._y! > toNode._y! ? 3 : 2);
}

/**
 * Calculates the bounding box for a node.
 */
export function calculateNodeBoundingBox(node: GraphNode, layoutType: string = LayoutType.Flow): BoundingBox {  
    const nodeX = node._x ?? 0;
    const nodeY = node._y ?? 0;
    const { width, height } = getNodeDimensions(node, layoutType);
    let minX, maxX, minY, maxY;
    if (layoutType === LayoutType.ForceAtlas) {
        const radius = 25;
        minX = nodeX - radius; maxX = nodeX + radius; minY = nodeY - radius; maxY = nodeY + radius;
    } else {
        minX = nodeX - width * 0.5; maxX = nodeX + width * 0.5; minY = nodeY - height * 0.5; maxY = nodeY + height * 0.5;
    }
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export function drawCornerHandles(ctx: CanvasRenderingContext2D, bbox: BoundingBox): void {
    const offset = HANDLE_OFFSET; const size = CORNER_HANDLE_SIZE;
    ctx.strokeStyle = HANDLE_STROKE_COLOR; ctx.lineWidth = HANDLE_STROKE_WIDTH * 2;
    const corners = [
        { x: bbox.minX - offset, y: bbox.minY - offset, dx: size, dy: size },
        { x: bbox.maxX + offset, y: bbox.minY - offset, dx: -size, dy: size },
        { x: bbox.minX - offset, y: bbox.maxY + offset, dx: size, dy: -size },
        { x: bbox.maxX + offset, y: bbox.maxY + offset, dx: -size, dy: -size }
    ];
    corners.forEach(c => {
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y + c.dy);
        ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.dx, c.y); ctx.stroke();
    });
}

/**
 * Calculates anchor handles.
 */
export function calculateAnchorHandles(bbox: BoundingBox, nodeType: string, centerX: number, centerY: number, layoutType: string = LayoutType.Flow): Record<string, PathPoint> {
    const anchors: Record<string, PathPoint> = {};
    const offset = HANDLE_OFFSET * 2;
    const { width, height } = bbox;
    const effectiveType = (layoutType === LayoutType.ForceAtlas) ? NodeType.Event : nodeType;
    const layoutShapes = (RENDER_CONFIG.shapes as any)[layoutType] || RENDER_CONFIG.shapes.Flow;
    const shapeDef: NodeShapeDefinition = layoutShapes[effectiveType] || { shape: 'roundedRect', Width: 110, Height: 65 };
    const shape = typeof shapeDef === 'string' ? shapeDef : shapeDef.shape;

    const s1_c = 0.07; const s2_c = 0.27; // circle shifts
    const s1_d = 0.17; const s2_d = 0.34; // diamond shifts

    for (let i = 1; i <= 3; i++) {
        let x = bbox.minX + (width * i / 4); 
        let y = bbox.minY - offset;
        if ((shape === 'circle' || shape === 'diamond') && (i === 1 || i === 3)) {
            const s1 = shape === 'circle' ? s1_c : s1_d;
            const s2 = shape === 'circle' ? s2_c : s2_d;
            y = bbox.minY + (height * s1) - (offset * 0.99);
            x = i === 1 ? bbox.minX + (width * s2) - (offset * 0.75) : bbox.maxX - (width * s2) + (offset * 0.75);
        }
        anchors[`top-${i}`] = { x, y };
    }
    for (let i = 1; i <= 3; i++) {
        let x = bbox.minX + (width * i / 4); 
        let y = bbox.maxY + offset;
        if ((shape === 'circle' || shape === 'diamond') && (i === 1 || i === 3)) {
            const s1 = shape === 'circle' ? s1_c : s1_d;
            const s2 = shape === 'circle' ? s2_c : s2_d;
            y = bbox.maxY - (height * s1) + (offset * 0.99);
            x = i === 1 ? bbox.minX + (width * s2) - (offset * 0.75) : bbox.maxX - (width * s2) + (offset * 0.75);
        }
        anchors[`bottom-${i}`] = { x, y };
    }
    for (let i = 1; i <= 3; i++) {
        let x = bbox.minX - offset; 
        let y = bbox.minY + (height * i / 4);
        if ((shape === 'circle' || shape === 'diamond') && (i === 1 || i === 3)) {
            const s1 = shape === 'circle' ? s1_c : s1_d;
            const s2 = shape === 'circle' ? s2_c : s2_d;
            x = bbox.minX + (width * s1) - (offset * 0.99);
            y = i === 1 ? bbox.minY + (height * s2) - (offset * 0.75) : bbox.maxY - (height * s2) + (offset * 0.75);
        }
        anchors[`left-${i}`] = { x, y };
    }
    for (let i = 1; i <= 3; i++) {
        let x = bbox.maxX + offset; 
        let y = bbox.minY + (height * i / 4);
        if ((shape === 'circle' || shape === 'diamond') && (i === 1 || i === 3)) {
            const s1 = shape === 'circle' ? s1_c : s1_d;
            const s2 = shape === 'circle' ? s2_c : s2_d;
            x = bbox.maxX - (width * s1) + (offset * 0.99);
            y = i === 1 ? bbox.minY + (height * s2) - (offset * 0.75) : bbox.maxY - (height * s2) + (offset * 0.75);
        }
        anchors[`right-${i}`] = { x, y };
    }
    return anchors;
}

export function drawAnchorHandles(ctx: CanvasRenderingContext2D, bbox: BoundingBox, nodeType: string, centerX: number, centerY: number, colors: any, hoveredHandle: NodeHandle | null = null, layoutType: string = LayoutType.Flow): void {
    const anchors = calculateAnchorHandles(bbox, nodeType, centerX, centerY, layoutType);
    Object.entries(anchors).forEach(([key, anchor]) => {
        ctx.beginPath(); ctx.arc(anchor.x, anchor.y, ANCHOR_HANDLE_DIAMETER * 0.5, 0, 2 * Math.PI);
        const isHovered = hoveredHandle && key === `${hoveredHandle.side}-${hoveredHandle.index}`;
        ctx.fillStyle = isHovered ? colors.AnchorHandleHover : colors.AnchorHandle;
        ctx.fill(); ctx.strokeStyle = HANDLE_STROKE_COLOR; ctx.lineWidth = HANDLE_STROKE_WIDTH * 0.75; ctx.stroke();
    });
}

export function drawNodeHandles(ctx: CanvasRenderingContext2D, node: GraphNode, colors: any, hoveredHandle: NodeHandle | null = null, layoutType: string = LayoutType.Flow): void {
    const bbox = calculateNodeBoundingBox(node, layoutType);
    drawCornerHandles(ctx, bbox);
    drawAnchorHandles(ctx, bbox, node.type, node._x!, node._y!, colors, hoveredHandle, layoutType);
}

export function calculateForceAtlasPath(fromNode: GraphNode, toNode: GraphNode, nodes: GraphNode[]): {path: PathPoint[], crossing: string, ctrlPt?: PathPoint} {
    const radius = 25; const dx = toNode._x! - fromNode._x!; const dy = toNode._y! - fromNode._y!; const dist = Math.sqrt(dx * dx + dy * dy);
    let path: PathPoint[] = dist === 0 ? [{ x: fromNode._x!, y: fromNode._y! }, { x: toNode._x!, y: toNode._y! }] : [{ x: fromNode._x! + (dx/dist)*radius, y: fromNode._y! + (dy/dist)*radius }, { x: toNode._x! - (dx/dist)*radius, y: toNode._y! - (dy/dist)*radius }];
    const crossingStatus = calculateForceAtlasPathHasNodeCrossing(path, nodes, fromNode, toNode);
    let ctrlPt: PathPoint | undefined;
    if (crossingStatus !== 'straight') {
        const p1 = path[0]; const p2 = path[path.length - 1]; const midX = (p1.x + p2.x)/2; const midY = (p1.y + p2.y)/2;
        const vdx = midX - p1.x; const vdy = midY - p1.y;
        let headAngle = crossingStatus === 'curveNegative' ? -Math.PI / 6 : Math.PI / 6;
        ctrlPt = { x: p1.x + (vdx*Math.cos(headAngle) - vdy*Math.sin(headAngle)), y: p1.y + (vdx*Math.sin(headAngle) + vdy*Math.cos(headAngle)) };
    }
        return {path, crossing: crossingStatus, ctrlPt};
}

export function calculateForceAtlasPathHasNodeCrossing(path: PathPoint[], nodes: GraphNode[], fromNode?: GraphNode, toNode?: GraphNode): string {
    for (const node of nodes) {
        if ((fromNode && node.id === fromNode.id) || (toNode && node.id === toNode.id)) continue;
        const nodeRect = calculateNodeBoundingBox(node, LayoutType.ForceAtlas);
        const centerX = (nodeRect.minX + nodeRect.maxX) * 0.5; const centerY = (nodeRect.minY + nodeRect.maxY) * 0.5; const radius = nodeRect.width * 0.5;
        const polyRadius = radius / Math.cos(Math.PI / 12); const vertices: PathPoint[] = [];
        for (let i = 0; i < 12; i++) vertices.push({ x: centerX + polyRadius * Math.cos(i * Math.PI / 6), y: centerY + polyRadius * Math.sin(i * Math.PI / 6) });
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i]; const p2 = path[i + 1];
            if (isPointInPolygon(p1, vertices) || isPointInPolygon(p2, vertices)) return "curve";
            for (let j = 0; j < 12; j++) {
                const v1 = vertices[j]; const v2 = vertices[(j + 1) % 12];
                const det = (p2.x - p1.x) * (v2.y - v1.y) - (p2.y - p1.y) * (v2.x - v1.x);
                if (det !== 0) {
                    const t = ((v1.x - p1.x) * (v2.y - v1.y) - (v1.y - p1.y) * (v2.x - v1.x)) / det;
                    const u = -((p1.x - v1.x) * (p2.y - p1.y) - (p1.y - v1.y) * (p2.x - p1.x)) / det;
                    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                        const angPath = Math.atan2(p2.y - p1.y, p2.x - p1.x); const angEdge = Math.atan2(v2.y - v1.y, v2.x - v1.x);
                        let diff = angEdge - angPath;
                        while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
                        return diff < 0 ? "curveNegative" : "curve";
                    }
                }
            }
        }
    }
    return "straight";
}

function isPointInPolygon(point: PathPoint, vertices: PathPoint[]): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        if (((vertices[i].y > point.y) !== (vertices[j].y > point.y)) && (point.x < (vertices[j].x - vertices[i].x) * (point.y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x)) inside = !inside;
    }
    return inside;
}

export function calculateFlowPath(fromNode: GraphNode, toNode: GraphNode, lvlW: number, rowH: number, layoutType: string = LayoutType.Flow): PathPoint[] {
    const sH = calculateSourceHandle(fromNode, toNode); const tH = calculateTargetHandle(fromNode, toNode);     
    const sX = fromNode._x! + calculateHandleOffsetX(fromNode, 'right', sH, layoutType); const sY = fromNode._y! + calculateHandleOffsetY(fromNode, 'right', sH, layoutType);
    const tX = toNode._x! + calculateHandleOffsetX(toNode, 'left', tH, layoutType); const tY = toNode._y! + calculateHandleOffsetY(toNode, 'left', tH, layoutType);
    const path: PathPoint[] = [{ x: sX, y: sY }];
    if (sX <= tX) {
        if (Math.abs(sY - tY) > 0.1) {
            const midX = (fromNode._x! + toNode._x!) * 0.5; path.push({ x: midX, y: sY }); path.push({ x: midX, y: tY });
        }
    } else {
        const dX1 = fromNode._x! + lvlW * 0.5; const dY = fromNode._isTopRow ? (sY - rowH * 0.8) : (sY + rowH * 0.8); const dX2 = toNode._x! - lvlW * 0.5;
        path.push({ x: dX1, y: sY }); path.push({ x: dX1, y: dY }); path.push({ x: dX2, y: dY }); path.push({ x: dX2, y: tY });
    }
    path.push({ x: tX, y: tY }); return path;
}

export function calculateTreePath(fromNode: GraphNode, toNode: GraphNode, switchToListLevel: number): PathPoint[] {
    const fBox = calculateNodeBoundingBox(fromNode, LayoutType.Tree); const tBox = calculateNodeBoundingBox(toNode, LayoutType.Tree);
    if ((fromNode._level || 0) < switchToListLevel) {
        const midY = (fBox.maxY + tBox.minY) * 0.5;
        return [{ x: fromNode._x!, y: fBox.maxY }, { x: fromNode._x!, y: midY }, { x: toNode._x!, y: midY }, { x: toNode._x!, y: tBox.minY }];
    }
    return [{ x: fBox.minX + fBox.width * 0.25, y: fBox.maxY }, { x: fBox.minX + fBox.width * 0.25, y: toNode._y! }, { x: tBox.minX, y: toNode._y! }];
}

/**
 * Prepares the geometry for a node, including text wrapping.
 */
export function getNodeGeometry(ctx: CanvasRenderingContext2D | null, node: GraphNode, layoutType: string = LayoutType.Flow): NodeGeometry {
    const { width, height, shape } = getNodeDimensions(node, layoutType);
    const rect = calculateNodeBoundingBox(node, layoutType);
    
    // Text Wrapping logic
    let maxWidth = (shape === 'circle' || layoutType === LayoutType.ForceAtlas) ? width * 0.5 : width - 10;
    
    // Adjust maxWidth for Event/Rule nodes with text below symbol
    if ((layoutType === LayoutType.Flow || layoutType === LayoutType.CompactFlow) && 
        (node.type === NodeType.Event || node.type === NodeType.Rule)) {
        maxWidth = width * 3;
    }

    const text = node.name ? getLangValue(node.name) : "";
    const lines = wrapText(ctx, text, maxWidth, 3);

    return {
        id: node.id,
        type: node.type,
        center: { x: node._x!, y: node._y! },
        boundingBox: { x: rect.minX, y: rect.minY, width: rect.width, height: rect.height },
        shape: shape,
        textLines: lines,
        textCenter: { x: node._x!, y: node._y! }
    };
}

function wrapText(ctx: CanvasRenderingContext2D | null, text: string, maxWidth: number, maxLines: number): string[] {
    if (!text) return [];

    let lines: string[] = [];
    if (!ctx) {
        // Fallback: character-count based wrapping when no context is available (e.g., for SVG)
        // Assume average character width of 6px for 10px Arial
        const avgCharWidth = 6;
        const maxChars = Math.floor(maxWidth / avgCharWidth);
        const words = text.split(' ');
        let currentLine = "";

        for (let i = 0; i < words.length; i++) {
            let testLine = currentLine + (currentLine ? " " : "") + words[i];
            if (testLine.length <= maxChars) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = words[i];
                // If a single word is too long, force break it
                if (currentLine.length > maxChars) {
                    lines.push(currentLine.substring(0, maxChars));
                    currentLine = currentLine.substring(maxChars);
                }
            }
        }
        if (currentLine) lines.push(currentLine);
    } else {
        ctx.font = '10px Arial';
        const words = text.split(' ');
        let currentLine = "";

        for (let i = 0; i < words.length; i++) {
            let testLine = currentLine + (currentLine ? " " : "") + words[i];
            if (ctx.measureText(testLine).width <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = words[i];
            }
        }
        if (currentLine) lines.push(currentLine);
    }

    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = lines[maxLines - 1].substring(0, Math.max(0, lines[maxLines - 1].length - 3)) + '...';
    }
    return lines;
}

/**
 * Converts a list of points to an SVG path string.
 */
export function pointsToSvgPath(points: PathPoint[], isQuadratic: boolean = false, controlPoint?: PathPoint): string {
    if (!points || points.length === 0) return "";
    if (isQuadratic && controlPoint && points.length >= 2) {
        const start = points[0];
        const end = points[points.length - 1];
        return `M ${start.x} ${start.y} Q ${controlPoint.x} ${controlPoint.y} ${end.x} ${end.y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
    return d;
}

/**
 * Prepares the geometry for an edge between two nodes.
 */
export function getEdgeGeometry(ctx: CanvasRenderingContext2D | null, fromNode: GraphNode, toNode: GraphNode, edge: GraphEdge | undefined, layoutType: string = LayoutType.Flow, switchToListLevel: number = 99, allNodes: GraphNode[], lvlW: number, rowH: number): EdgeGeometry {
    let path: PathPoint[]; let crossing = 'straight'; let ctrlPt: PathPoint | undefined;
    if (layoutType === LayoutType.Tree) path = calculateTreePath(fromNode, toNode, switchToListLevel);
    else if (layoutType === LayoutType.ForceAtlas) { const res = calculateForceAtlasPath(fromNode, toNode, allNodes); path = res.path; crossing = res.crossing; ctrlPt = res.ctrlPt; }
    else path = calculateFlowPath(fromNode, toNode, lvlW, rowH, layoutType);

    const end = path[path.length - 1];
    const prev = (crossing === 'straight') ? (path.length >= 2 ? path[path.length - 2] : path[0]) : (ctrlPt || path[0]);
    const arrowAngle = Math.atan2(end.y - prev.y, end.x - prev.x);
    let labelText = edge?.description ? getLangValue(edge.description) : undefined;
    let labelPosition: Point | undefined;
    if (labelText) {
        if (crossing === 'straight') { const mi = Math.floor(path.length / 2); if (path.length % 2 === 0 && path.length >= 2) labelPosition = { x: (path[mi - 1].x + path[mi].x) / 2, y: (path[mi - 1].y + path[mi].y) / 2 }; else labelPosition = { x: path[mi].x, y: path[mi].y }; }
        else { const p1 = path[0]; const p2 = end; labelPosition = { x: 0.25 * p1.x + 0.5 * (ctrlPt?.x || 0) + 0.25 * p2.x, y: 0.25 * p1.y + 0.5 * (ctrlPt?.y || 0) + 0.25 * p2.y }; }
    }

    return { fromId: fromNode.id, toId: toNode.id, path: path, isQuadratic: crossing !== 'straight', controlPoint: ctrlPt, arrowAngle: arrowAngle, labelPosition: labelPosition, labelText: labelText };
}

export function drawUnifiedArrow(ctx: CanvasRenderingContext2D, fromNode: GraphNode, toNode: GraphNode, edge: GraphEdge | undefined, colors: any, lvlW: number, rowH: number, isHovered: boolean = false, isSelected: boolean = false, layoutType: string = LayoutType.Flow, switchToListLevel: number = 99, allNodes: GraphNode[]): void {
    const geo = getEdgeGeometry(ctx, fromNode, toNode, edge, layoutType, switchToListLevel, allNodes, lvlW, rowH);
    let edgeColor = isSelected ? '#007bff' : (isHovered ? (colors.AnchorHandleHover || '#ADD8E6') : colors.CommonArrow);
    if (!isSelected && !isHovered && layoutType === LayoutType.ForceAtlas && edge?.type) {
        if (edge.type === EdgeType.Parent) edgeColor = colors.ParentArrow || '#006400';
        else if (edge.type === EdgeType.Predecessor) edgeColor = colors.PredecessorArrow || '#4A5D4E';
        else if (edge.type === EdgeType.Responsible) edgeColor = colors.ResponsibleArrow || '#A52A2A';
        else if (edge.type.includes('input')) edgeColor = colors.InputArrow || '#AAA';
        else if (edge.type.includes('output')) edgeColor = colors.OutputArrow || '#AAA';
        else if (edge.type === EdgeType.Uses) edgeColor = colors.UsesArrow || '#AA9933';
    }
    CanvasRenderer.renderEdge(ctx, geo, edgeColor, isSelected || isHovered);
}

export function drawEdgeHandles(ctx: CanvasRenderingContext2D, path: PathPoint[], colors: any, hoveredAnchorIndex: number | null = null): void {
    path.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, ANCHOR_HANDLE_DIAMETER * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = (hoveredAnchorIndex === i) ? colors.AnchorHandleHover : colors.AnchorHandle;
        ctx.fill(); ctx.strokeStyle = HANDLE_STROKE_COLOR; ctx.lineWidth = HANDLE_STROKE_WIDTH * 0.75; ctx.stroke();
    });
}

export function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, offsetX: number, offsetY: number, nodes: GraphNode[], colors: any, lvlW: number, rowH: number, isEditable: boolean, hoveredEdge: Edge | null = null, selectedEdge: Edge | null = null, hoveredNode: GraphNode | null = null, selectedNode: GraphNode | null = null, layoutType: string = LayoutType.Flow, switchToListLevel: number = 99): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.translate(offsetX, offsetY);
    const drawn = new Set<string>();
    const isStructural = layoutType !== LayoutType.Box && layoutType !== LayoutType.TaskList && layoutType !== LayoutType.ForceAtlas;
    if (isStructural) {
        nodes.forEach(n => {
            (n._successorsCalculated || []).forEach(s => {
                const k = `${n.id}|${s.id}|calculated`; if (drawn.has(k)) return; drawn.add(k);
                drawUnifiedArrow(ctx, n, s, n.outgoing?.find(e => e.id === s.id), colors, lvlW, rowH, isEditable && hoveredEdge?.fromId === n.id && hoveredEdge?.toId === s.id, isEditable && selectedEdge?.fromId === n.id && selectedEdge?.toId === s.id, layoutType, switchToListLevel, nodes);
            });
        });
    } else {
        nodes.forEach(n => {
            (n.outgoing || []).forEach(e => {
                const k = `${n.id}|${e.id}|${e.type||'d'}`; if (drawn.has(k)) return; drawn.add(k);
                const s = nodes.find(nn => nn.id === e.id); if (s) drawUnifiedArrow(ctx, n, s, e, colors, lvlW, rowH, isEditable && hoveredEdge?.fromId === n.id && hoveredEdge?.toId === e.id, isEditable && selectedEdge?.fromId === n.id && selectedEdge?.toId === e.id, layoutType, switchToListLevel, nodes);
            });
            if (layoutType === LayoutType.ForceAtlas && n.incoming) {
                n.incoming.forEach(e => {
                    const k = `${e.id}|${n.id}|${e.type||'d'}`; if (drawn.has(k)) return; drawn.add(k);
                    const p = nodes.find(nn => nn.id === e.id); if (p) drawUnifiedArrow(ctx, p, n, e, colors, lvlW, rowH, isEditable && hoveredEdge?.fromId === e.id && hoveredEdge?.toId === n.id, isEditable && selectedEdge?.fromId === e.id && selectedEdge?.toId === n.id, layoutType, switchToListLevel, nodes);
                });
            }
        });
    }
    nodes.forEach(n => drawNode(ctx, n, colors, isEditable && selectedNode?.id === n.id, isEditable && hoveredNode?.id === n.id, layoutType));
}

if (typeof window !== 'undefined') {
    const exports = { calculateHandleOffsetX, calculateHandleOffsetY, drawWrappedText, drawNode, drawUnifiedArrow, render, calculateNodeBoundingBox, calculateAnchorHandles, drawNodeHandles, calculateSourceHandle, calculateTargetHandle, calculateFlowPath, calculateTreePath, drawEdgeHandles, calculateForceAtlasPath, calculateForceAtlasPathHasNodeCrossing, getNodeDimensions, getEdgeGeometry, getNodeGeometry, pointsToSvgPath };
    Object.assign(window, exports);
}
