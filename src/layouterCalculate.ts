/**
 * @file layouterCalculate.ts
 * Original, optimized layout logic converted to TypeScript.
 */

import { ScenarioNode, TaskCollectionScenario } from './manifest.js';
import { BoundingBox } from './renderer.js';

/**
 * Validates and transforms the raw graph data from JSON.

 * Supports legacy array format and new TaskCollectionScenario object format.
 */
export function validateAndTransformGraph(data: any): TaskCollectionScenario {
    let scenario: TaskCollectionScenario = {
        scenarioName: 'Unnamed Scenario',
        layoutType: 'flow',
        layoutPreferences: {},
        nodes: []
    };

    if (Array.isArray(data)) {
        // Legacy format
        scenario.nodes = JSON.parse(JSON.stringify(data));
    } else if (data && typeof data === 'object') {
        // New format
        scenario.scenarioName = data.scenarioName || 'Unnamed Scenario';
        scenario.layoutType = data.layoutType || 'flow';
        scenario.layoutPreferences = data.layoutPreferences || {};
        scenario.nodes = Array.isArray(data.nodes) ? JSON.parse(JSON.stringify(data.nodes)) : [];
    }

    scenario.nodes.forEach(node => {
        if (typeof node.id === 'undefined') {
            node.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
        }
        if (!node.type) {
            node.type = 'Task';
        }
        if (!node.name) {
            node.name = 'Node ' + node.id;
        }
        
        // Normalize predecessors
        if (!node.predecessors) {
            node.predecessors = [];
        } else {
            node.predecessors = node.predecessors.map((p: any) => 
                typeof p === 'string' ? { id: p, weight: 1 } : { id: p.id, weight: p.weight ?? 1 }
            );
        }

        // Initialize successors as an empty array
        node.successors = [];

        if (!node.description) {
            node.description = '';
        }

        if (typeof node.overrideFillColor === 'undefined') {
            node.overrideFillColor = null;
        }

        if (typeof node.overrideStrokeColor === 'undefined') {
            node.overrideStrokeColor = null;
        }
    });

    return scenario;
}

/**
 * Calculates successors for each node based on predecessors.
 * Weight is inherited from the predecessor's entry for this node.
 */
export function evolveSuccessors(nodes: ScenarioNode[]): void {
    const nodeMap = new Map<string, ScenarioNode>();
    nodes.forEach(node => {
        node.successors = []; // Reset just in case
        nodeMap.set(node.id, node);
    });

    nodes.forEach(node => {
        node.predecessors.forEach(predEntry => {
            const predecessor = nodeMap.get(predEntry.id);
            if (predecessor) {
                if (!predecessor.successors.some(s => s.id === node.id)) {
                    predecessor.successors.push({ 
                        id: node.id, 
                        weight: predEntry.weight ?? 1 
                    });
                }
            }
        });
    });
}

/**
 * Robust layout algorithm with BFS and 'isTopRow' detection.
 */
export function calculateFlowLayout(nodes: ScenarioNode[], columnWidth: number, rowHeight: number): void {
    const nodeMap = new Map<string, ScenarioNode>();
    nodes.forEach(node => { nodeMap.set(node.id, node); });

    const visited = new Set<string>();
    const levelOccupancy = new Map<number, Set<number>>();
    let currentY = 0;
    const startX = 0;

    function isYOccupied(level: number, y: number): boolean {
        const levelSet = levelOccupancy.get(level);
        if (!levelSet) return false;
        return levelSet.has(y);
    }

    function markYOccupied(level: number, y: number): void {
        if (!levelOccupancy.has(level)) levelOccupancy.set(level, new Set<number>());
        levelOccupancy.get(level)!.add(y);
    }

    function processComponent(startNode: ScenarioNode, initialY: number): number {
        const queue: ScenarioNode[] = [startNode];
        startNode.level = 0;
        startNode.x = startX;
        startNode.y = initialY;
        startNode.isTopRow = true;
        visited.add(startNode.id);
        markYOccupied(0, startNode.y!);

        let maxYInComp = initialY;
        while (queue.length > 0) {
            const curr = queue.shift()!;
            // Sort successors by weight (descending) before layout calculation
            const childrenEntries = [...(curr.successors || [])].sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));

            childrenEntries.forEach((childEntry, index) => {
                const childId = childEntry.id;
                const child = nodeMap.get(childId);
                if (child && !visited.has(childId)) {
                    child.level = (curr.level || 0) + 1;
                    child.x = startX + child.level * columnWidth;
                    let targetY = (curr.y || 0) + index * rowHeight;
                    child.isTopRow = (index === 0 && curr.isTopRow);
                    while (isYOccupied(child.level, targetY)) { 
                        targetY += rowHeight; 
                        child.isTopRow = false; 
                    }
                    child.y = targetY;
                    maxYInComp = Math.max(maxYInComp, child.y);
                    markYOccupied(child.level, child.y);
                    visited.add(childId);
                    queue.push(child);
                }
            });
        }
        return maxYInComp;
    }

    // Process root nodes in the order they appear in the JSON file
    const startNodes = nodes.filter(n => n.predecessors.length === 0);
    startNodes.forEach(node => {
        if (!visited.has(node.id)) {
            const maxY = processComponent(node, currentY);
            currentY = maxY + rowHeight * 2;
        }
    });

    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const maxY = processComponent(node, currentY);
            currentY = maxY + rowHeight * 2;
        }
    });
}

/**
 * Simple grid-based layout.
 */
export function calculateBoxLayout(nodes: ScenarioNode[], columnWidth: number, rowHeight: number, maxColumns: number = 4): void {
    nodes.forEach((node, index) => {
        const col = index % maxColumns;
        const row = Math.floor(index / maxColumns);
        node.x = col * columnWidth;
        node.y = row * rowHeight;
        node.level = col;
        node.isTopRow = (row === 0);
    });
}

/**
 * Hierarchical tree layout.
 * Supports horizontal spreading for upper levels and switching to 
 * indented list-style layout after a certain level.
 */
export function calculateTreeLayout(nodes: ScenarioNode[], columnWidth: number, rowHeight: number, switchToListLevel: number = 99): void {
    const nodeMap = new Map<string, ScenarioNode>();
    nodes.forEach(node => { nodeMap.set(node.id, node); });

    const visited = new Set<string>();
    let currentY = 0;

    // Internal spacing adjustment: Increase horizontal distance for tree phase 
    // to avoid overlaps with wider subtrees, but only if tree phase exists.
    const effectiveColumnWidth = (switchToListLevel > 0) ? columnWidth * 1.5 : columnWidth;

    // Helper to calculate total width of a subtree to allow centering
    function getSubtreeWidth(node: ScenarioNode, level: number): number {
        const children = (node.successors || [])
            .map(s => nodeMap.get(s.id))
            .filter(n => n && !visited.has(n.id)) as ScenarioNode[];
        
        if (children.length === 0 || level >= switchToListLevel) return effectiveColumnWidth;
        
        let totalWidth = 0;
        children.forEach(child => {
            totalWidth += getSubtreeWidth(child, level + 1);
        });
        return Math.max(effectiveColumnWidth, totalWidth);
    }

    function layoutNode(node: ScenarioNode, level: number, x: number, availableWidth: number): number {
        if (visited.has(node.id)) return 0;
        visited.add(node.id);

        node.level = level;
        // Center node within its allocated width
        node.x = x + (availableWidth / 2);
        node.y = currentY;
        node.isTopRow = (level === 0);

        let maxY = currentY;
        const children = (node.successors || [])
            .map(s => nodeMap.get(s.id))
            .filter(n => n && !visited.has(n.id)) as ScenarioNode[];

        if (children.length > 0) {
            if (level >= switchToListLevel) {
                // List style: children are placed vertically below parent, 
                // offset to the right by 50% of the original columnWidth
                const listIndentation = columnWidth * 0.5;
                children.forEach(child => {
                    currentY += rowHeight;
                    // In list mode, availableWidth is just columnWidth, offset is exactly 50%
                    const childMaxY = layoutNode(child, level + 1, node.x! - (columnWidth/2) + listIndentation, columnWidth);
                    maxY = Math.max(maxY, childMaxY);
                });
            } else {
                // Tree style: children spread out horizontally in the next row
                currentY += rowHeight;
                let childX = x;
                
                // Calculate widths for all children first to distribute them
                const childWidths = children.map(child => getSubtreeWidth(child, level + 1));
                const totalChildrenWidth = childWidths.reduce((a, b) => a + b, 0);
                
                // Center the children block under the parent
                childX = node.x! - (totalChildrenWidth / 2);

                const startYForChildren = currentY;
                children.forEach((child, index) => {
                    const childWidth = childWidths[index];
                    const childMaxY = layoutNode(child, level + 1, childX, childWidth);
                    maxY = Math.max(maxY, childMaxY);
                    childX += childWidth;
                    // Reset currentY for siblings so they start on the same horizontal line
                    if (index < children.length - 1) currentY = startYForChildren;
                });
            }
        }

        return Math.max(maxY, currentY);
    }

    const rootNodes = nodes.filter(n => n.predecessors.length === 0);
    rootNodes.forEach(root => {
        // Reset visited for width calculation to see full potential
        const tempVisited = new Set(visited);
        const totalWidth = getSubtreeWidth(root, 0);
        const componentMaxY = layoutNode(root, 0, 0, totalWidth);
        currentY = componentMaxY + rowHeight * 2;
    });

    // Handle remaining unvisited nodes
    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const totalWidth = getSubtreeWidth(node, 0);
            const componentMaxY = layoutNode(node, 0, 0, totalWidth);
            currentY = componentMaxY + rowHeight * 2;
        }
    });
}

/**
 * Calculates the bounding box of the entire graph.
 */
export function calculateGraphBoundings(nodes: ScenarioNode[], sizes: any): BoundingBox {
    if (nodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
        let nMinX, nMaxX, nMinY, nMaxY;
        if (node.type === 'Event') {
            const r = sizes.eventSize * 0.5;
            nMinX = node.x! - r; nMaxX = node.x! + r; nMinY = node.y! - r; nMaxY = node.y! + r + 10 + 42;
        } else if (node.type === 'Task' || node.type === 'SubProcess') {
            const w = (node.type === 'Task' ? sizes.taskWidth : sizes.subProcessWidth) * 0.5;
            const h = (node.type === 'Task' ? sizes.taskHeight : sizes.subProcessHeight) * 0.5;
            nMinX = node.x! - w; nMaxX = node.x! + w; nMinY = node.y! - h; nMaxY = node.y! + h;
        } else if (node.type === 'Rule') {
            const s = sizes.ruleSize * 0.5;
            nMinX = node.x! - s; nMaxX = node.x! + s; nMinY = node.y! - s; nMaxY = node.y! + s + 10 + 42;
        } else {
            nMinX = nMaxX = node.x!; nMinY = nMaxY = node.y!;
        }
        minX = Math.min(minX, nMinX); maxX = Math.max(maxX, nMaxX);
        minY = Math.min(minY, nMinY); maxY = Math.max(maxY, nMaxY);
    });

    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

// Global exposure for browser (legacy)
if (typeof window !== 'undefined') {
    (window as any).validateAndTransformGraph = validateAndTransformGraph;
    (window as any).evolveSuccessors = evolveSuccessors;
    (window as any).calculateFlowLayout = calculateFlowLayout;
    (window as any).calculateBoxLayout = calculateBoxLayout;
    (window as any).calculateTreeLayout = calculateTreeLayout;
    (window as any).calculateGraphBoundings = calculateGraphBoundings;
}
