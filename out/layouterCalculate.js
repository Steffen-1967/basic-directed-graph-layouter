/**
 * Validates and transforms the raw graph data from JSON.
 * Ensures the data is an array and each node has the necessary properties.
 * 
 * @param {any} data - The raw data to validate (expected to be an array of nodes).
 * @returns {Array} The validated and transformed array of nodes.
 */
function validateAndTransformGraph(data) {
    let nodes = JSON.parse(JSON.stringify(data)); // Deep copy to avoid modifying raw data

    if (!Array.isArray(nodes)) {
        console.warn('Graph data is not an array. Initializing with empty array.');
        nodes = [];
    }

    nodes.forEach(node => {
        if (typeof node.id === 'undefined') {
            node.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
        }
        if (!node.type) {
            node.type = 'Task';
        }
        if (!node.name) {
            node.name = 'Node ' + node.id;
        }
        if (!node.predecessorIds) {
            node.predecessorIds = [];
        }
        // Initialize successorIds as an empty array
        node.successorIds = [];
        
        if (!node.description) {
            node.description = '';
        }
    });

    return nodes;
}

/**
 * Calculates successorIds for each node based on predecessorIds.
 * 
 * @param {Array} nodes - The list of nodes.
 */
function evolveSuccessors(nodes) {
    const nodeMap = new Map();
    nodes.forEach(node => {
        node.successorIds = []; // Reset just in case
        nodeMap.set(node.id, node);
    });

    nodes.forEach(node => {
        node.predecessorIds.forEach(predId => {
            const predecessor = nodeMap.get(predId);
            if (predecessor) {
                if (!predecessor.successorIds.includes(node.id)) {
                    predecessor.successorIds.push(node.id);
                }
            }
        });
    });
}

/**
 * Robust layout algorithm with BFS and 'isTopRow' detection.
 * 
 * @param {Array} nodes - The list of nodes to be positioned.
 * @param {number} columnWidth - Horizontal distance between columns.
 * @param {number} rowHeight - Vertical distance between rows.
 */
function calculateLayout(nodes, columnWidth, rowHeight) {
    const nodeMap = new Map();
    // No need for successorsMap anymore, we use node.successorIds
    nodes.forEach(node => { nodeMap.set(node.id, node); });

    const visited = new Set();
    const levelOccupancy = new Map();
    let currentY = 0; 
    const startX = 0; 

    function isYOccupied(level, y) {
        if (!levelOccupancy.has(level)) return false;
        return levelOccupancy.get(level).has(y);
    }

    function markYOccupied(level, y) {
        if (!levelOccupancy.has(level)) levelOccupancy.set(level, new Set());
        levelOccupancy.get(level).add(y);
    }

    function processComponent(startNode, initialY) {
        const queue = [startNode];
        startNode.level = 0;
        startNode.x = startX;
        startNode.y = initialY;
        startNode.isTopRow = true; 
        visited.add(startNode.id);
        markYOccupied(0, startNode.y);

        let maxYInComp = initialY;
        while (queue.length > 0) {
            const curr = queue.shift();
            // Use pre-calculated successorIds
            const childrenIds = curr.successorIds || [];
            childrenIds.forEach((childId, index) => {
                const child = nodeMap.get(childId);
                if (child && !visited.has(childId)) {
                    child.level = (curr.level || 0) + 1;
                    child.x = startX + child.level * columnWidth;
                    let targetY = (curr.y || 0) + index * rowHeight;
                    child.isTopRow = (index === 0 && curr.isTopRow); 
                    while (isYOccupied(child.level, targetY)) { targetY += rowHeight; child.isTopRow = false; }
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
    const startNodes = nodes.filter(n => n.predecessorIds.length === 0);
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
 * Calculates the bounding box of the entire graph.
 * 
 * @param {Array} nodes - The list of positioned nodes
 * @param {Object} sizes - Size configuration for different node types
 * @returns {Object} Bounding box with properties: minX, maxX, minY, maxY, width, height
 */
function calculateGraphBoundings(nodes, sizes) {
    if (nodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
        let nMinX, nMaxX, nMinY, nMaxY;
        if (node.type === 'Event') {
            const r = sizes.eventSize * 0.5;
            nMinX = node.x - r; nMaxX = node.x + r; nMinY = node.y - r; nMaxY = node.y + r + 10 + 42;
        } else if (node.type === 'Task' || node.type === 'SubProcess') {
            const w = (node.type === 'Task' ? sizes.taskWidth : sizes.subProcessWidth) * 0.5;
            const h = (node.type === 'Task' ? sizes.taskHeight : sizes.subProcessHeight) * 0.5;
            nMinX = node.x - w; nMaxX = node.x + w; nMinY = node.y - h; nMaxY = node.y + h;
        } else if (node.type === 'Rule') {
            const s = sizes.ruleSize * 0.5;
            nMinX = node.x - s; nMaxX = node.x + s; nMinY = node.y - s; nMaxY = node.y + s + 10 + 42;
        } else {
            nMinX = nMaxX = node.x; nMinY = nMaxY = node.y;
        }
        minX = Math.min(minX, nMinX); maxX = Math.max(maxX, nMaxX);
        minY = Math.min(minY, nMinY); maxY = Math.max(maxY, nMaxY);
    });

    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

if (typeof module !== 'undefined') {
    module.exports = { validateAndTransformGraph, evolveSuccessors, calculateLayout, calculateGraphBoundings };
}
