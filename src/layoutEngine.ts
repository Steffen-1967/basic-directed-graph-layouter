/**
 * @file layoutEngine.ts
 * @description Centralized layout calculation engine.
 * Handles structural analysis, coordinate assignment for various layouts,
 * and data structure validation/transformation.
 */

import { 
    GraphNode, 
    LayoutType, 
    LayoutPreferences,
    RENDER_CONFIG,
    NodeType,
    getLangValue,
    EvaluationType,
    isStructureFormingEdge,
    toMultiLang,
    Envelope,
    newEnvelope
} from './manifest';
import type { NetworkService } from './networkService';
import type { BoundingBox } from './renderer';

import { LoggerProxy } from './loggerProxy';

const layouterLoggerProxy = new LoggerProxy('LAYOUTER');

/**
 * LayoutEngine service to handle all graph layout calculations and structural analysis.
 */
export class LayoutEngine {
    private onWarning?: (message: string, type: 'info' | 'warning' | 'error') => void;
    private isApplyingLayout: boolean = false;
    private lastLayoutKey: string | null = null;
    private lastLayoutTime: number = 0;

    constructor(private networkService?: NetworkService, onWarning?: (message: string, type: 'info' | 'warning' | 'error') => void) {
        this.onWarning = onWarning;
    }

    public setNetworkService(ns: NetworkService): void {
        this.networkService = ns;
    }

    public clearCache(): void {
        this.lastLayoutKey = null;
        this.isApplyingLayout = false;
    }

    /**
     * Entry point for applying a layout to a set of nodes.
     */
    async applyLayout(
        allNodes: GraphNode[],
        type: LayoutType,
        preferences?: LayoutPreferences
    ): Promise<GraphNode[]> {
        if (!allNodes || allNodes.length === 0) return [];

        if (this.isApplyingLayout) {
            console.log(`[LAYOUT] Already applying layout. Ignoring request for ${type}`);
            return allNodes;
        }

        this.isApplyingLayout = true;
        console.log(`[LAYOUT] Applying layout: ${type} for ${allNodes.length} nodes`);

        try {
            this.resetCalculatedProperties(allNodes);

            const isStructural = type === LayoutType.Flow || type === LayoutType.Tree || type === LayoutType.CompactFlow;
            if (isStructural) {
                LayoutEngine.evolveOutgoingPredecessorsForFlow(allNodes);
            }

            let nodesToLayout: GraphNode[] = allNodes;
            if (type === LayoutType.CompactFlow || type === LayoutType.TaskList) {
                this.calculateEvaluation(allNodes);

                const allowedShapes = RENDER_CONFIG.shapes[type] || RENDER_CONFIG.shapes[LayoutType.CompactFlow] || {};
                const nodesToHide = new Set<string>();
                const rejectedTypes = new Set<NodeType>();

                allNodes.forEach(node => {
                    if (!allowedShapes[node.type]) {
                        nodesToHide.add(node.id);
                        rejectedTypes.add(node.type);
                    }
                });

                if (rejectedTypes.size > 0 && this.onWarning) {
                    this.onWarning(`Layout '${type}' blendet ${Array.from(rejectedTypes).join(', ')} aus.`, 'warning');
                }

                if (type === LayoutType.CompactFlow) {
                    this.bridgeNodesMarkedForHiding(allNodes, nodesToHide);
                }
                nodesToLayout = allNodes.filter(n => !nodesToHide.has(n.id));
            }

            if (nodesToLayout.length === 0) return [];

            switch (type) {
                case LayoutType.Flow: LayoutEngine.calculateFlowLayout(nodesToLayout, RENDER_CONFIG.colW || 140, RENDER_CONFIG.rowH || 100); break;
                case LayoutType.CompactFlow: LayoutEngine.calculateCompactFlowLayout(nodesToLayout, RENDER_CONFIG.colW || 140, RENDER_CONFIG.rowH || 100); break;
                case LayoutType.Box: LayoutEngine.calculateBoxLayout(nodesToLayout, RENDER_CONFIG.colW || 140, RENDER_CONFIG.rowH || 100, preferences?.maxColumns || 4); break;
                case LayoutType.Tree: LayoutEngine.calculateTreeLayout(nodesToLayout, RENDER_CONFIG.colW || 140, RENDER_CONFIG.rowH || 100, preferences?.switchToListLevel ?? 99); break;
                case LayoutType.TaskList: LayoutEngine.calculateTaskListLayout(nodesToLayout); break;
                case LayoutType.ForceAtlas:
                    if (this.networkService) {
                        this.resetCalculatedProperties(nodesToLayout);
                        
                        // Initialization for ForceAtlas
                        const size = 50;
                        const standardTypes = ['event', 'rule', 'task'];
                        const superTypes = ['subprocess'];

                        const standardNodes = nodesToLayout.filter(n => standardTypes.includes((n.type || '').toLowerCase()));
                        const superNodes = nodesToLayout.filter(n => superTypes.includes((n.type || '').toLowerCase()));
                        const supportNodes = nodesToLayout.filter(n => {
                            const t = (n.type || '').toLowerCase();
                            return !standardTypes.includes(t) && !superTypes.includes(t);
                        });

                        const fullWidth = 10 * size;
                        const halfWidth = 10 * size;

                        standardNodes.forEach((node, index) => {
                            const count = standardNodes.length;
                            node._x = (count > 1) ? (index / (count - 1)) * fullWidth - (fullWidth / 2) : 0;
                            node._y = -3 * size;
                        });

                        superNodes.forEach((node, index) => {
                            const count = superNodes.length;
                            node._x = (count > 1) ? (index / (count - 1)) * halfWidth - (halfWidth / 2) : 0;
                            node._y = 0;
                        });

                        const circleCenterX = 0;
                        const circleCenterY = 5 * size;
                        const circleRadius = (3 * size) / 2;
                        supportNodes.forEach((node, index) => {
                            const count = supportNodes.length;
                            const angle = (count > 0) ? (index / count) * 2 * Math.PI : 0;
                            node._x = circleCenterX + circleRadius * Math.cos(angle);
                            node._y = circleCenterY + circleRadius * Math.sin(angle);
                        });

                        nodesToLayout.forEach(n => {
                            if (n._x === undefined || n._y === undefined) {
                                n._x = Math.random() * 500;
                                n._y = Math.random() * 500;
                            }
                        });

                        const newPositions = await this.networkService.requestForceAtlasLayout(nodesToLayout);  
                        LayoutEngine.calculateForceAtlasLayout(nodesToLayout, newPositions);
                        return [...nodesToLayout]; 
                    }
                    break;
            }
            return nodesToLayout;
        } finally {
            this.isApplyingLayout = false;
        }
    }

    /**
     * Bridges structural gaps when nodes are filtered out.
     */
    private bridgeNodesMarkedForHiding(allNodes: GraphNode[], nodesToHide: Set<string>): void {
        const nodeMap = new Map(allNodes.map(n => [n.id, n]));
        const visibleNodes = allNodes.filter(n => !nodesToHide.has(n.id));

        allNodes.forEach(node => {
            node._predecessorsCalculated = []; 
            node._successorsCalculated = [];
        });

        const adj = new Map<string, Set<string>>();
        allNodes.forEach(node => {
            if (!adj.has(node.id)) adj.set(node.id, new Set());
            (node.outgoing || []).forEach(e => {
                if (isStructureFormingEdge(e.type)) {
                    adj.get(node.id)!.add(e.id);
                    if (!adj.has(e.id)) adj.set(e.id, new Set());
                }
            });
            (node.incoming || []).forEach(e => {
                if (isStructureFormingEdge(e.type)) {
                    if (!adj.has(e.id)) adj.set(e.id, new Set());
                    adj.get(e.id)!.add(node.id);
                }
            });
        });

        visibleNodes.forEach(startNode => {
            const queue: string[] = [];
            const visitedInSearch = new Set<string>();
            (adj.get(startNode.id) || []).forEach(neighborId => {
                if (!visitedInSearch.has(neighborId)) {
                    queue.push(neighborId);
                    visitedInSearch.add(neighborId);
                }
            });

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const currentNode = nodeMap.get(currentId);
                if (!currentNode) continue;

                if (!nodesToHide.has(currentId)) {
                    if (!startNode._successorsCalculated!.some(s => s.id === currentId)) {
                        startNode._successorsCalculated!.push(currentNode);
                        if (!currentNode._predecessorsCalculated!.some(p => p.id === startNode.id)) {
                            currentNode._predecessorsCalculated!.push(startNode);
                        }
                    }
                } else {
                    (adj.get(currentId) || []).forEach(neighborId => {
                        if (!visitedInSearch.has(neighborId)) {
                            visitedInSearch.add(neighborId);
                            queue.push(neighborId);
                        }
                    });
                }
            }
        });
    }

    private calculateEvaluation(nodes: GraphNode[]): void {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        nodes.forEach(node => {
            if (node.type === NodeType.Task) {
                const incomingIds = new Set<string>();
                if (node.incoming) node.incoming.forEach(e => incomingIds.add(e.id));
                nodes.forEach(other => { if (other.outgoing && other.outgoing.some(e => e.id === node.id)) incomingIds.add(other.id); });
                incomingIds.forEach(id => {
                    const other = nodeMap.get(id);
                    if (!other) return;
                    if (other.type === NodeType.Event) {
                        node._incomingEvaluation = EvaluationType.Event;
                    } else if (other.type === NodeType.Rule) {
                        const isAnd = getLangValue(other.name).toLowerCase().includes('and');
                        let totalRulePre = (other.incoming || []).filter(e => isStructureFormingEdge(e.type)).length;
                        nodes.forEach(n => { if (n.id !== other.id && n.outgoing && n.outgoing.some(e => e.id === other.id && isStructureFormingEdge(e.type))) totalRulePre++; });
                        node._incomingEvaluation = isAnd ? (totalRulePre > 1 ? EvaluationType.MultipleAnd : EvaluationType.SingleAnd) : (totalRulePre > 1 ? EvaluationType.MultipleOr : EvaluationType.SingleOr);
                    }
                });
                const outgoingIds = new Set<string>();
                if (node.outgoing) node.outgoing.forEach(e => outgoingIds.add(e.id));
                nodes.forEach(other => { if (other.incoming && other.incoming.some(e => e.id === node.id)) outgoingIds.add(other.id); });
                outgoingIds.forEach(id => {
                    const other = nodeMap.get(id);
                    if (!other) return;
                    if (other.type === NodeType.Event) {
                        node._outgoingEvaluation = EvaluationType.Event;
                    } else if (other.type === NodeType.Rule) {
                        const isAnd = getLangValue(other.name).toLowerCase().includes('and');
                        let totalRuleSucc = (other.outgoing || []).filter(e => isStructureFormingEdge(e.type)).length;
                        nodes.forEach(n => { if (n.id !== other.id && n.incoming && n.incoming.some(e => e.id === other.id && isStructureFormingEdge(e.type))) totalRuleSucc++; });
                        node._outgoingEvaluation = isAnd ? (totalRuleSucc > 1 ? EvaluationType.MultipleAnd : EvaluationType.SingleAnd) : (totalRuleSucc > 1 ? EvaluationType.MultipleOr : EvaluationType.SingleOr);
                    }
                });
            }
        });
    }

    static calculateCompactFlowLayout(nodes: GraphNode[], columnWidth: number, rowHeight: number): void {
        const visited = new Set<string>();
        const levelOccupancy = new Map<number, Set<number>>();
        let currentY = 0;
        const startX = 0;
        const effRowH = rowHeight * 0.8;

        function isYOccupied(level: number, y: number): boolean {
            const levelSet = levelOccupancy.get(level);
            return levelSet ? levelSet.has(y) : false;
        }

        function markYOccupied(level: number, y: number): void {
            if (!levelOccupancy.has(level)) levelOccupancy.set(level, new Set<number>());
            levelOccupancy.get(level)!.add(y);
        }

        function processComponent(startNode: GraphNode, initialY: number): number {
            const queue: GraphNode[] = [startNode];
            startNode._level = 0; startNode._x = startX; startNode._y = initialY; startNode._isTopRow = true;
            visited.add(startNode.id); markYOccupied(0, startNode._y!);

            let maxYInComp = initialY;
            while (queue.length > 0) {
                const curr = queue.shift()!;
                const children = curr._successorsCalculated || [];
                children.forEach((child, index) => {
                    if (!visited.has(child.id)) {
                        child._level = (curr._level || 0) + 1;
                        child._x = startX + child._level * columnWidth;
                        let targetY = (curr._y || 0) + index * effRowH;
                        child._isTopRow = (index === 0 && curr._isTopRow);
                        while (isYOccupied(child._level, targetY)) { targetY += effRowH; child._isTopRow = false; }
                        child._y = targetY; maxYInComp = Math.max(maxYInComp, child._y);
                        markYOccupied(child._level, child._y); visited.add(child.id); queue.push(child);
                    }
                });
            }
            return maxYInComp;
        }

        const startNodes = nodes.filter(n => (n._predecessorsCalculated || []).length === 0);
        startNodes.forEach(node => {
            if (!visited.has(node.id)) {
                const maxY = processComponent(node, currentY);
                currentY = maxY + effRowH * 1.5;
            }
        });
        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const maxY = processComponent(node, currentY);
                currentY = maxY + effRowH * 1.5;
            }
        });
    }

    static calculateFlowLayout(nodes: GraphNode[], columnWidth: number, rowHeight: number): void {
        const visited = new Set<string>();
        const levelOccupancy = new Map<number, Set<number>>();
        let currentY = 0;
        const startX = 0;

        function isYOccupied(level: number, y: number): boolean {
            const levelSet = levelOccupancy.get(level);
            return levelSet ? levelSet.has(y) : false;
        }

        function markYOccupied(level: number, y: number): void {
            if (!levelOccupancy.has(level)) levelOccupancy.set(level, new Set<number>());
            levelOccupancy.get(level)!.add(y);
        }

        function processComponent(startNode: GraphNode, initialY: number): number {
            const queue: GraphNode[] = [startNode];
            startNode._level = 0; startNode._x = startX; startNode._y = initialY; startNode._isTopRow = true;
            visited.add(startNode.id); markYOccupied(0, startNode._y!);

            let maxYInComp = initialY;
            while (queue.length > 0) {
                const curr = queue.shift()!;
                const children = curr._successorsCalculated || [];
                children.forEach((child, index) => {
                    if (!visited.has(child.id)) {
                        child._level = (curr._level || 0) + 1;
                        child._x = startX + child._level * columnWidth;
                        let targetY = (curr._y || 0) + index * rowHeight;
                        child._isTopRow = (index === 0 && curr._isTopRow);
                        while (isYOccupied(child._level, targetY)) { targetY += rowHeight; child._isTopRow = false; }
                        child._y = targetY; maxYInComp = Math.max(maxYInComp, child._y);
                        markYOccupied(child._level, child._y); visited.add(child.id); queue.push(child);
                    }
                });
            }
            return maxYInComp;
        }

        const startNodes = nodes.filter(n => (n._predecessorsCalculated || []).length === 0);
        startNodes.forEach(node => { if (!visited.has(node.id)) { const maxY = processComponent(node, currentY); currentY = maxY + rowHeight * 2; } });
        nodes.forEach(node => { if (!visited.has(node.id)) { const maxY = processComponent(node, currentY); currentY = maxY + rowHeight * 2; } });
    }

    static calculateBoxLayout(nodes: GraphNode[], columnWidth: number, rowHeight: number, maxColumns: number = 4): void {
        nodes.forEach((node, index) => {
            const col = index % maxColumns;
            const row = Math.floor(index / maxColumns);
            node._x = col * columnWidth;
            node._y = row * rowHeight;
            node._level = col;
            node._isTopRow = (row === 0);
        });
    }

    static calculateTreeLayout(nodes: GraphNode[], columnWidth: number, rowHeight: number, switchToListLevel: number = 99): void {
        const visited = new Set<string>();
        let currentY = 0;
        const effectiveColumnWidth = (switchToListLevel > 0) ? columnWidth * 1.5 : columnWidth;

        function getSubtreeWidth(node: GraphNode, level: number): number {
            const children = (node._successorsCalculated || []).filter(n => !visited.has(n.id));
            if (children.length === 0 || level >= switchToListLevel) return effectiveColumnWidth;
            let totalWidth = 0;
            children.forEach(child => { totalWidth += getSubtreeWidth(child, level + 1); });
            return Math.max(effectiveColumnWidth, totalWidth);
        }

        function layoutNode(node: GraphNode, level: number, x: number, availableWidth: number): number {        
            if (visited.has(node.id)) return 0;
            visited.add(node.id);
            node._level = level; node._x = x + (availableWidth / 2); node._y = currentY; node._isTopRow = (level === 0);
            let maxY = currentY;
            const children = (node._successorsCalculated || []).filter(n => !visited.has(n.id));
            if (children.length > 0) {
                if (level >= switchToListLevel) {
                    const listIndentation = columnWidth * 0.5;
                    children.forEach(child => {
                        currentY += rowHeight;
                        const childMaxY = layoutNode(child, level + 1, node._x! - (columnWidth/2) + listIndentation, columnWidth);
                        maxY = Math.max(maxY, childMaxY);
                    });
                } else {
                    currentY += rowHeight;
                    const childWidths = children.map(child => getSubtreeWidth(child, level + 1));
                    const totalChildrenWidth = childWidths.reduce((a, b) => a + b, 0);
                    let childX = node._x! - (totalChildrenWidth / 2);
                    const startYForChildren = currentY;
                    children.forEach((child, index) => {
                        const childWidth = childWidths[index];
                        const childMaxY = layoutNode(child, level + 1, childX, childWidth);
                        maxY = Math.max(maxY, childMaxY);
                        childX += childWidth;
                        if (index < children.length - 1) currentY = startYForChildren;
                    });
                }
            }
            return Math.max(maxY, currentY);
        }

        const rootNodes = nodes.filter(n => (n._predecessorsCalculated || []).length === 0);
        rootNodes.forEach(root => { const totalWidth = getSubtreeWidth(root, 0); const componentMaxY = layoutNode(root, 0, 0, totalWidth); currentY = componentMaxY + rowHeight * 2; });
        nodes.forEach(node => { if (!visited.has(node.id)) { const totalWidth = getSubtreeWidth(node, 0); const componentMaxY = layoutNode(node, 0, 0, totalWidth); currentY = componentMaxY + rowHeight * 2; } });
    }

    static calculateTaskListLayout(nodes: GraphNode[], rowHeight: number = 80): GraphNode[] {
        let currentY = 0;
        nodes.forEach((node, index) => { 
            node._x = 0; 
            node._y = currentY; 
            node._level = 0; 
            node._isTopRow = (index === 0); 
            currentY += rowHeight * 0.8; 
        });
        return nodes;
    }

    static evolveOutgoingPredecessorsForFlow(nodes: GraphNode[]): void {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        nodes.forEach(node => {
            node._predecessorsCalculated = [];
            node._successorsCalculated = [];
        });

        nodes.forEach(node => {
            (node.outgoing || []).forEach(edge => {
                const targetNode = nodeMap.get(edge.id);
                if (targetNode) {
                    if (!node._successorsCalculated!.some(s => s.id === targetNode.id)) {
                        node._successorsCalculated!.push(targetNode);
                    }
                    if (!targetNode._predecessorsCalculated!.some(p => p.id === node.id)) {
                        targetNode._predecessorsCalculated!.push(node);
                    }
                }
            });

            (node.incoming || []).forEach(edge => {
                const sourceNode = nodeMap.get(edge.id);
                if (sourceNode) {
                    if (!node._predecessorsCalculated!.some(p => p.id === sourceNode.id)) {
                        node._predecessorsCalculated!.push(sourceNode);
                    }
                    if (!sourceNode._successorsCalculated!.some(s => s.id === node.id)) {
                        sourceNode._successorsCalculated!.push(node);
                    }
                }
            });
        });
    }

    /**
     * Cleans up an envelope for persistence by removing circular references
     * and transient layout properties.
     */
    static cleanupEnvelopeForPersistence(envelope: Envelope, cleanupNodes: boolean = false): Envelope {
        const cleanedEnvelope: Envelope = { ...envelope };
        if (cleanupNodes) {
            cleanedEnvelope.nodes = cleanedEnvelope.nodes.map(node => {
                const { _x, _y, _level, _isTopRow, _incomingEvaluation, _outgoingEvaluation, _predecessorsCalculated, _successorsCalculated, ...rest } = node;
                return rest;
            });
        }
        return cleanedEnvelope;
    }

    static calculateGraphBoundings(nodes: GraphNode[], layoutType: string = LayoutType.Flow): BoundingBox {     
        if (!nodes || nodes.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            const x = node._x ?? node.x ?? 0;
            const y = node._y ?? node.y ?? 0;

            // TRICK: We now use the radius/diameter directly for ForceAtlas circles
            // to ensure correct centering and bounding box.
            let width = 110; 
            let height = 65;

            if (layoutType === LayoutType.ForceAtlas) {
                width = 50; height = 50;
            }

            let nodeMinX = x - width * 0.5;
            let nodeMaxX = x + width * 0.5;
            let nodeMinY = y - height * 0.5;
            let nodeMaxY = y + height * 0.5;

            minX = Math.min(minX, nodeMinX);
            minY = Math.min(minY, nodeMinY);
            maxX = Math.max(maxX, nodeMaxX);
            maxY = Math.max(maxY, nodeMaxY);
        });

        if (minX === Infinity) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
        }

        const padding = 200;
        return {
            minX: minX - padding,
            minY: minY - padding,
            width: (maxX - minX) + 2 * padding,
            height: (maxY - minY) + 2 * padding,
            maxX: maxX + padding,
            maxY: maxY + padding
        };
    }

    private resetCalculatedProperties(nodes: GraphNode[]): void {
        nodes.forEach(n => { n._predecessorsCalculated = []; n._successorsCalculated = []; delete n._incomingEvaluation; delete n._outgoingEvaluation; });
    }

    static calculateForceAtlasLayout(nodes: GraphNode[], newPositions: {id: string, x: number, y: number}[]): void {
        if (!newPositions || newPositions.length === 0) return;
        const nodeMap = new Map<string, GraphNode>();
        nodes.forEach(n => nodeMap.set(n.id, n));
        
        // TRICK: Remove artificial scaling. Use raw algorithm coordinates.
        newPositions.forEach((pos: any) => { 
            const node = nodeMap.get(pos.id); 
            if (node) { 
                node._x = pos.x; 
                node._y = pos.y; 
            } 
        });
    }

    static validateAndTransformGraph(data: Envelope): Envelope {
    let envelope: Envelope = newEnvelope(data.exporter, toMultiLang('Unnamed Envelope'), toMultiLang(''), LayoutType.Flow, data.root);

    if (Array.isArray(data)) {
        envelope.nodes = JSON.parse(JSON.stringify(data));
    } else if (data && typeof data === 'object') {
        envelope.name = data.name || 'Unnamed Envelope';
        envelope.layoutType = data.layoutType || LayoutType.Flow;
        envelope.layoutPreferences = data.layoutPreferences || {};
        envelope.nodes = Array.isArray(data.nodes) ? JSON.parse(JSON.stringify(data.nodes)) : [];
    }

    envelope.nodes.forEach(node => {
        if (typeof node.id === 'undefined') {
            node.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
        }
        if (!node.type) node.type = NodeType.Task;
        if (!node.name) node.name = toMultiLang('Node ' + node.id);
        if (!node.incoming) node.incoming = [];
        if (!node.outgoing) node.outgoing = [];
        if (!node.description) node.description = toMultiLang('');
        if (typeof node.overrideFillColor === 'undefined') node.overrideFillColor = null;
        if (typeof node.overrideStrokeColor === 'undefined') node.overrideStrokeColor = null;
    });

    return envelope;
}
}
