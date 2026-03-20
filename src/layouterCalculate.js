/**
 * Robust layout algorithm with BFS and 'isTopRow' detection.
 * 
 * This function modifies the input nodes array in-place, adding layout properties
 * to each node that are required for rendering in the browser.
 * 
 * @param {Array} nodes - The list of nodes to be positioned. Each node will be modified in-place.
 * @param {number} columnWidth - Horizontal distance between columns.
 * @param {number} rowHeight - Vertical distance between rows.
 * 
 * @modifies {nodes} - Adds the following properties to each node:
 *   - x {number} - Horizontal position on canvas
 *   - y {number} - Vertical position on canvas  
 *   - level {number} - Distance from root node (determines column)
 *   - isTopRow {boolean} - Whether node is on the primary path (affects arrow routing)
 */
function calculateLayout(nodes, columnWidth, rowHeight) {
    const nodeMap = new Map();
    const successorsMap = new Map();
    
    // Initialize maps
    nodes.forEach(node => {
        nodeMap.set(node.id, node);
        successorsMap.set(node.id, []);
    });

    // Build successors map
    nodes.forEach(node => {
        node.predecessorIds.forEach(predId => {
            const successors = successorsMap.get(predId);
            if (successors) {
                successors.push(node.id);
            }
        });
    });

    const visited = new Set();
    const levelOccupancy = new Map();
    let currentY = 0; 
    const startX = 0; 

    /**
     * Checks if a vertical position is already taken in a specific level.
     */
    function isYOccupied(level, y) {
        if (!levelOccupancy.has(level)) return false;
        return levelOccupancy.get(level).has(y);
    }

    /**
     * Marks a vertical position as occupied in a specific level.
     */
    function markYOccupied(level, y) {
        if (!levelOccupancy.has(level)) levelOccupancy.set(level, new Set());
        levelOccupancy.get(level).add(y);
    }

    /**
     * Processes a connected component of the graph using BFS.
     */
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
            const childrenIds = successorsMap.get(curr.id) || [];
            
            childrenIds.forEach((childId, index) => {
                const child = nodeMap.get(childId);
                if (child && !visited.has(childId)) {
                    child.level = (curr.level || 0) + 1;
                    child.x = startX + child.level * columnWidth;
                    
                    let targetY = (curr.y || 0) + index * rowHeight;
                    child.isTopRow = (index === 0 && curr.isTopRow); 

                    // Avoid collisions
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

    // Process all components starting from root nodes (no predecessors)
    const startNodes = nodes.filter(n => n.predecessorIds.length === 0).sort((a, b) => a.id - b.id);
    startNodes.forEach(node => {
        if (!visited.has(node.id)) {
            const maxY = processComponent(node, currentY);
            currentY = maxY + rowHeight * 2;
        }
    });

    // Catch any remaining nodes (e.g., in cycles without a clear root)
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
 * @param {number} sizes.eventSize - Diameter of event nodes
 * @param {number} sizes.taskWidth - Width of task nodes
 * @param {number} sizes.taskHeight - Height of task nodes
 * @param {number} sizes.ruleSize - Diagonal size of rule nodes
 * @returns {Object} Bounding box with properties: minX, maxX, minY, maxY, width, height
 */
function calculateGraphBoundings(nodes, sizes) {
    if (nodes.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
        let nodeMinX, nodeMaxX, nodeMinY, nodeMaxY;

        if (node.type === 'Event') {
            const radius = sizes.eventSize * 0.5;
            nodeMinX = node.x - radius;
            nodeMaxX = node.x + radius;
            nodeMinY = node.y - radius;
            nodeMaxY = node.y + radius + 10 + 42; // +10 gap + ~3 lines of text
        } else if (node.type === 'Task') {
            nodeMinX = node.x - sizes.taskWidth * 0.5;
            nodeMaxX = node.x + sizes.taskWidth * 0.5;
            nodeMinY = node.y - sizes.taskHeight * 0.5;
            nodeMaxY = node.y + sizes.taskHeight * 0.5;
        } else if (node.type === 'Rule') {
            nodeMinX = node.x - sizes.ruleSize * 0.5;
            nodeMaxX = node.x + sizes.ruleSize * 0.5;
            nodeMinY = node.y - sizes.ruleSize * 0.5;
            nodeMaxY = node.y + sizes.ruleSize * 0.5 + 10 + 42; // +10 gap + ~3 lines of text
        } else {
            nodeMinX = node.x;
            nodeMaxX = node.x;
            nodeMinY = node.y;
            nodeMaxY = node.y;
        }

        minX = Math.min(minX, nodeMinX);
        maxX = Math.max(maxX, nodeMaxX);
        minY = Math.min(minY, nodeMinY);
        maxY = Math.max(maxY, nodeMaxY);
    });

    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY
    };
}

if (typeof module !== 'undefined') {
    module.exports = { calculateLayout, calculateGraphBoundings };
}
