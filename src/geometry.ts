/**
 * @file geometry.ts
 * Pure geometry calculation logic for graph elements.
 * No Canvas API calls here.
 */

import { RENDER_CONFIG, GraphNode, GraphEdge, LayoutType, NodeShape, NodeShapeDefinition, getLangValue, MultiLangProp } from './manifest';

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface NodeGeometry {
    id: string;
    center: Point;
    boundingBox: Rect;
    shape: NodeShape;
    textLines: string[];
    textCenter: Point;
    evaluators?: {
        incoming?: { type: string, pos: Point };
        outgoing?: { type: string, pos: Point };
    };
}

export interface EdgeGeometry {
    fromId: string;
    toId: string;
    path: Point[];
    isQuadratic: boolean;
    controlPoint?: Point;
    arrowAngle: number;
    labelPosition?: Point;
    labelText?: string;
}

/**
 * Pure helper to get dimensions without rendering.
 */
export function getNodeDimensions(node: GraphNode, layoutType: string = LayoutType.Flow): { width: number; height: number; shape: NodeShape } {
    let layoutShapes = (RENDER_CONFIG.shapes as any)[layoutType] || RENDER_CONFIG.shapes.Flow;
    let shapeDef: NodeShapeDefinition = layoutShapes[node.type] || RENDER_CONFIG.shapes.Flow[node.type] || { shape: 'roundedRect', Width: 110, Height: 65 };
    
    if (typeof shapeDef === 'string') return { width: 110, height: 65, shape: shapeDef as NodeShape };
    return { width: shapeDef.Width, height: shapeDef.Height, shape: shapeDef.shape };
}

/**
 * Calculates the bounding box for a node.
 */
export function calculateNodeRect(node: GraphNode, layoutType: string = LayoutType.Flow): Rect {
    const { width, height } = getNodeDimensions(node, layoutType);
    if (layoutType === LayoutType.ForceAtlas) {
        const radius = 25;
        return { x: node._x! - radius, y: node._y! - radius, width: radius * 2, height: radius * 2 };
    }
    return { x: node._x! - width * 0.5, y: node._y! - height * 0.5, width, height };
}

/**
 * Calculates anchor point offsets from node center.
 */
export function getAnchorOffset(node: GraphNode, side: 'top'|'bottom'|'left'|'right', index: number, layoutType: string = LayoutType.Flow): Point {
    const { width, height, shape } = getNodeDimensions(node, layoutType);
    let dx = 0, dy = 0;

    if (shape === 'roundedRect' || shape === 'rect' || shape === 'roundedRectWithBox' || shape === 'roundedRectWithEvaluators') {
        if (side === 'top' || side === 'bottom') {
            dx = (index === 1) ? -width * 0.25 : (index === 3 ? width * 0.25 : 0);
            dy = (side === 'top') ? -height * 0.5 : height * 0.5;
        } else {
            dx = (side === 'left') ? -width * 0.5 : width * 0.5;
            dy = (index === 1) ? -height * 0.25 : (index === 3 ? height * 0.25 : 0);
        }
    } else if (shape === 'circle' || shape === 'diamond') {
        const s1 = shape === 'circle' ? 0.07 : 0.17; 
        const s2 = shape === 'circle' ? 0.27 : 0.34;
        if (side === 'top' || side === 'bottom') {
            dx = (index === 1) ? -width * s2 : (index === 3 ? width * s2 : 0);
            dy = (side === 'top') ? -height * (index === 2 ? 0.5 : 0.5 - s1) : height * (index === 2 ? 0.5 : 0.5 - s1);
        } else {
            dx = (side === 'left') ? -width * (index === 2 ? 0.5 : 0.5 - s1) : width * (index === 2 ? 0.5 : 0.5 - s1);
            dy = (index === 1) ? -height * s2 : (index === 3 ? height * s2 : 0);
        }
    }
    return { x: dx, y: dy };
}
