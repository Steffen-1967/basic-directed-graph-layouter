// Handle rendering constants
const HANDLE_OFFSET = 2;
const CORNER_HANDLE_SIZE = 10;
const ANCHOR_HANDLE_DIAMETER = 10;
const HANDLE_BACK_COLOR = '#8c979f';
const HANDLE_STROKE_COLOR = '#6c757d';
const HANDLE_STROKE_WIDTH = 2;

/**
 * Calculates the horizontal offset from the center point of a node to its edge.
 * This is used for precise arrow positioning and bounding box calculations.
 * 
 * @param {Object} node - The node object containing type information
 * @param {Object} sizes - Configuration object with node dimensions
 * @param {number} sizes.eventSize - Diameter of event nodes
 * @param {number} sizes.taskWidth - Width of task nodes
 * @param {number} sizes.ruleSize - Diagonal size of rule nodes (diamond)
 * @returns {number} The horizontal distance from node center to its right edge
 */
function getXOffset(node, sizes) {
    if (node.type === 'Event') return sizes.eventSize * 0.5;
    if (node.type === 'Task') return sizes.taskWidth * 0.5;
    if (node.type === 'Rule') return sizes.ruleSize * 0.5;
    return 0;
}

/**
 * Renders text with automatic word wrapping and optional truncation.
 * Splits text into multiple lines to fit within the specified width constraint.
 * 
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {string} text - The text content to render
 * @param {number} x - Horizontal center position for the text
 * @param {number} y - Vertical start position (top or middle, depending on centered parameter)
 * @param {number} maxWidth - Maximum width in pixels before wrapping
 * @param {number} maxLines - Maximum number of lines to display (excess lines are truncated with '...')
 * @param {Object} colors - Color configuration object
 * @param {string} colors.Text - Color for the text
 * @param {boolean} [centered=false] - If true, text is vertically centered around y; otherwise y is the top
 */
function drawWrappedText(ctx, text, x, y, maxWidth, maxLines, colors, centered = false) {
    ctx.fillStyle = colors.Text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = centered ? 'middle' : 'top';
    
    const words = text.split(' ');
    let lines = [];
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
 * Supports three node types: Event (circle), Task (rounded rectangle), and Rule (diamond).
 * Each type has distinct visual styling and text positioning.
 * 
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} node - The node object to render
 * @param {string} node.type - Node type: 'Event', 'Task', or 'Rule'
 * @param {string} node.name - Display name of the node
 * @param {number} node.x - Horizontal center position on canvas
 * @param {number} node.y - Vertical center position on canvas
 * @param {Object} colors - Color configuration for different node types
 * @param {string} colors.Event - Fill color for event nodes
 * @param {string} colors.Task - Fill color for task nodes
 * @param {string} colors.Rule - Fill color for rule nodes
 * @param {string} colors.Stroke - Border color for all nodes
 * @param {Object} sizes - Size configuration for different node types
 * @param {number} sizes.eventRadius - Radius of event circles
 * @param {number} sizes.taskWidth - Width of task rectangles
 * @param {number} sizes.taskHeight - Height of task rectangles
 * @param {number} sizes.ruleSize - Diagonal size of rule diamonds
 */
function drawNode(ctx, node, colors, sizes) {
    if (node.type === 'Event') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, sizes.eventSize * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = colors.Event;
        ctx.fill();
        ctx.strokeStyle = colors.Stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        drawWrappedText(ctx, node.name, node.x, node.y + sizes.eventSize * 0.5 + 10, sizes.eventSize * 1.4, 3, colors);
    } else if (node.type === 'Task') {
        const x = node.x - sizes.taskWidth * 0.5;
        const y = node.y - sizes.taskHeight * 0.5;
        ctx.beginPath();
        ctx.roundRect(x, y, sizes.taskWidth, sizes.taskHeight, 10);
        ctx.fillStyle = colors.Task;
        ctx.fill();
        ctx.strokeStyle = colors.Stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        drawWrappedText(ctx, node.name, node.x, node.y, sizes.taskWidth - 10, 3, colors, true);
    } else if (node.type === 'Rule') {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - sizes.ruleSize * 0.5);
        ctx.lineTo(node.x + sizes.ruleSize * 0.5, node.y);
        ctx.lineTo(node.x, node.y + sizes.ruleSize * 0.5);
        ctx.lineTo(node.x - sizes.ruleSize * 0.5, node.y);
        ctx.closePath();
        ctx.fillStyle = colors.Rule;
        ctx.fill();
        ctx.strokeStyle = colors.Stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        drawWrappedText(ctx, node.name, node.x, node.y + sizes.ruleSize * 0.5 + 10, sizes.ruleSize * 1.25, 3, colors);
    }
}

/**
 * Draws a routed arrow connection between two nodes with intelligent path finding.
 * Implements Manhattan routing with special handling for backward edges (loops).
 * Arrows always enter from the left and exit to the right of nodes.
 * 
 * Path routing logic:
 * - Forward edges (left to right): Simple L-shaped path via midpoint
 * - Backward edges (right to left): Detour path above or below nodes to avoid overlaps
 * - Rule nodes: Arrows connect to diagonal edges with mathematical precision
 * 
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} fromNode - Source node of the arrow
 * @param {number} fromNode.x - X position of source node
 * @param {number} fromNode.y - Y position of source node
 * @param {string} fromNode.type - Type of source node ('Event', 'Task', or 'Rule')
 * @param {boolean} fromNode.isTopRow - Whether source is on primary path (affects detour direction)
 * @param {Object} toNode - Target node of the arrow
 * @param {number} toNode.x - X position of target node
 * @param {number} toNode.y - Y position of target node
 * @param {string} toNode.type - Type of target node
 * @param {Object} colors - Color configuration
 * @param {string} colors.Arrow - Color for arrow lines and heads
 * @param {Object} sizes - Size configuration for nodes
 * @param {number} lvlW - Column width (horizontal spacing between levels)
 * @param {number} rowH - Row height (vertical spacing between rows)
 */
function drawUnifiedArrow(ctx, fromNode, toNode, colors, sizes, lvlW, rowH) {
    const headLength = 10;
    
    let startY1 = fromNode.y;
    if (fromNode.type === 'Rule' && fromNode.y !== toNode.y) {
        const direction = toNode.y > fromNode.y ? 1 : -1;
        startY1 += direction * (sizes.ruleSize * 0.25);
    }
    
    const dyStart = Math.abs(startY1 - fromNode.y);
    let startX1 = fromNode.x + (fromNode.type === 'Rule' ? (sizes.ruleSize * 0.5 - dyStart) : getXOffset(fromNode, sizes));

    let endY2 = toNode.y;
    if (toNode.type === 'Rule' && fromNode.y !== toNode.y) {
        const direction = fromNode.y > toNode.y ? 1 : -1;
        endY2 += direction * (sizes.ruleSize * 0.25);
    }
    
    const dyEnd = Math.abs(endY2 - toNode.y);
    let endX2 = toNode.x - (toNode.type === 'Rule' ? (sizes.ruleSize * 0.5 - dyEnd) : getXOffset(toNode, sizes));

    ctx.beginPath();
    ctx.strokeStyle = colors.Arrow;
    ctx.lineWidth = 2;
    ctx.moveTo(startX1, startY1);

    if (startX1 <= endX2) {
        const midX = (fromNode.x + toNode.x) * 0.5;
        ctx.lineTo(midX, startY1);
        ctx.lineTo(midX, endY2);
        ctx.lineTo(endX2, endY2);
    } else {
        const detourX1 = fromNode.x + lvlW * 0.5;
        const detourY = fromNode.isTopRow ? (startY1 - rowH * 0.8) : (startY1 + rowH * 0.8);
        const detourX2 = toNode.x - lvlW * 0.5;

        ctx.lineTo(detourX1, startY1);
        ctx.lineTo(detourX1, detourY);
        ctx.lineTo(detourX2, detourY);
        ctx.lineTo(detourX2, endY2);
        ctx.lineTo(endX2, endY2);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX2, endY2);
    ctx.lineTo(endX2 - headLength, endY2 - headLength * 0.667);
    ctx.lineTo(endX2 - headLength, endY2 + headLength * 0.667);
    ctx.closePath();
    ctx.fillStyle = colors.Arrow;
    ctx.fill();
}

/**
 * Main rendering function that draws the complete process graph on the canvas.
 * Renders in two passes: first all arrows (background), then all nodes (foreground).
 * This ensures nodes are always drawn on top of connection lines.
 * 
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} offsetX - Horizontal pan offset for viewport positioning
 * @param {number} offsetY - Vertical pan offset for viewport positioning
 * @param {Array<Object>} nodes - Array of all nodes to render
 * @param {Object} colors - Color configuration for all visual elements
 * @param {Object} sizes - Size configuration for all node types
 * @param {number} lvlW - Column width (horizontal spacing)
 * @param {number} rowH - Row height (vertical spacing)
 */
function render(ctx, canvas, offsetX, offsetY, nodes, colors, sizes, lvlW, rowH) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(offsetX, offsetY);
    
    nodes.forEach(node => {
        if (node.predecessorIds) {
            node.predecessorIds.forEach(predId => {
                const predNode = nodes.find(n => n.id === predId);
                if (predNode) {
                    drawUnifiedArrow(ctx, predNode, node, colors, sizes, lvlW, rowH);
                }
            });
        }
    });
    
    nodes.forEach(node => drawNode(ctx, node, colors, sizes));
}

/**
 * Calculates the bounding box for a node (only the geometric shape, excluding text).
 * 
 * @param {Object} node - The node object
 * @param {Object} sizes - Size configuration for different node types
 * @returns {Object} Bounding box with properties: minX, maxX, minY, maxY
 */
function getNodeBoundingBox(node, sizes) {
    let minX, maxX, minY, maxY;

    if (node.type === 'Event') {
        const radius = sizes.eventSize * 0.5;
        minX = node.x - radius;
        maxX = node.x + radius;
        minY = node.y - radius;
        maxY = node.y + radius;
    } else if (node.type === 'Task') {
        minX = node.x - sizes.taskWidth * 0.5;
        maxX = node.x + sizes.taskWidth * 0.5;
        minY = node.y - sizes.taskHeight * 0.5;
        maxY = node.y + sizes.taskHeight * 0.5;
    } else if (node.type === 'Rule') {
        minX = node.x - sizes.ruleSize * 0.5;
        maxX = node.x + sizes.ruleSize * 0.5;
        minY = node.y - sizes.ruleSize * 0.5;
        maxY = node.y + sizes.ruleSize * 0.5;
    } else {
        minX = node.x;
        maxX = node.x;
        minY = node.y;
        maxY = node.y;
    }

    return { minX, maxX, minY, maxY };
}

/**
 * Draws corner handles at the four corners of a bounding box.
 * Each handle is an L-shaped line with specified leg length.
 * 
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} bbox - Bounding box with minX, maxX, minY, maxY
 * @param {string} color - Color for the corner handles
 */
function drawCornerHandles(ctx, bbox, color) {
    const offset = HANDLE_OFFSET;
    const size = CORNER_HANDLE_SIZE;
    
    ctx.strokeStyle = HANDLE_STROKE_COLOR;
    ctx.lineWidth = HANDLE_STROKE_WIDTH * 1.5;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(bbox.minX - offset, bbox.minY - offset);
    ctx.lineTo(bbox.minX - offset, bbox.minY - offset + size);
    ctx.moveTo(bbox.minX - offset, bbox.minY - offset);
    ctx.lineTo(bbox.minX - offset + size, bbox.minY - offset);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(bbox.maxX + offset, bbox.minY - offset);
    ctx.lineTo(bbox.maxX + offset, bbox.minY - offset + size);
    ctx.moveTo(bbox.maxX + offset, bbox.minY - offset);
    ctx.lineTo(bbox.maxX + offset - size, bbox.minY - offset);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(bbox.minX - offset, bbox.maxY + offset);
    ctx.lineTo(bbox.minX - offset, bbox.maxY + offset - size);
    ctx.moveTo(bbox.minX - offset, bbox.maxY + offset);
    ctx.lineTo(bbox.minX - offset + size, bbox.maxY + offset);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(bbox.maxX + offset, bbox.maxY + offset);
    ctx.lineTo(bbox.maxX + offset, bbox.maxY + offset - size);
    ctx.moveTo(bbox.maxX + offset, bbox.maxY + offset);
    ctx.lineTo(bbox.maxX + offset - size, bbox.maxY + offset);
    ctx.stroke();
}

/**
 * Calculates the center positions of all 12 anchor handles for a node.
 * Returns an object with keys like "top-1", "left-2", "bottom-3", etc.
 * 
 * @param {Object} bbox - Bounding box with minX, maxX, minY, maxY
 * @param {string} nodeType - Type of the node ('Event', 'Task', or 'Rule')
 * @param {number} centerX - X coordinate of node center
 * @param {number} centerY - Y coordinate of node center
 * @param {Object} sizes - Size configuration for different node types
 * @returns {Object} Object with keys like "top-1", "left-2" containing {x, y} coordinates
 */
function calculateAnchorHandles(bbox, nodeType, centerX, centerY, sizes) {
    const anchors = {};
    const offset = HANDLE_OFFSET;
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;

    // Helper function to calculate shifted position for Event (circle)
    function getEventShift(dx, dy, eventSize, edge, position) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return { shiftX: 0, shiftY: 0 };
        const scale = (eventSize * 0.5) / dist;
        return {
            shiftX: dx * scale,
            shiftY: dy * scale
        };
    }

    // Helper function to calculate shifted position for Rule (diamond)
    function getRuleShift(dx, dy, ruleSize, edge, position) {
        const manhattanDist = Math.abs(dx) + Math.abs(dy);
        if (manhattanDist === 0) return { shiftX: 0, shiftY: 0 };
        const scale = (ruleSize * 0.5) / manhattanDist;
        return {
            shiftX: dx * scale,
            shiftY: dy * scale
        };
    }

    // Top edge - 3 anchors
    for (let i = 1; i <= 3; i++) {
        let x = bbox.minX + (width * i / 4);
        let y = bbox.minY - offset;
        
        if ((nodeType === 'Event' || nodeType === 'Rule') && (i === 1 || i === 3)) {
            y = bbox.minY - offset * 1.5;
            const dx = x - centerX;
            const dy = y - centerY;
            
            if (nodeType === 'Event') {
                const shift = getEventShift(dx, dy, sizes.eventSize, 'top', i);
                x = centerX + shift.shiftX;
                y = centerY + shift.shiftY;
            } else if (nodeType === 'Rule') {
                const shift = getRuleShift(dx, dy, sizes.ruleSize, 'top', i);
                x = centerX + shift.shiftX;
                y = centerY + shift.shiftY;
            }
            if (i === 1) x = x - offset * 0.5;
            if (i === 3) x = x + offset * 0.5;
        }
        
        anchors[`top-${i}`] = { x, y };
    }

    // Bottom edge - 3 anchors
    for (let i = 1; i <= 3; i++) {
        let x = bbox.minX + (width * i / 4);
        let y = bbox.maxY + offset;
        
        if ((nodeType === 'Event' || nodeType === 'Rule') && (i === 1 || i === 3)) {
            y = bbox.maxY + offset * 1.5;
            const dx = x - centerX;
            const dy = y - centerY;
            
            if (nodeType === 'Event') {
                const shift = getEventShift(dx, dy, sizes.eventSize, 'bottom', i);
                x = centerX + shift.shiftX;
                y = centerY + shift.shiftY;
            } else if (nodeType === 'Rule') {
                const shift = getRuleShift(dx, dy, sizes.ruleSize, 'bottom', i);
                x = centerX + shift.shiftX;
                y = centerY + shift.shiftY;
            }
            if (i === 1) x = x - offset * 0.5;
            if (i === 3) x = x + offset * 0.5;
        }
        
        anchors[`bottom-${i}`] = { x, y };
    }

    // Left edge - 3 anchors
    for (let i = 1; i <= 3; i++) {
        let x = bbox.minX - offset;
        let y = bbox.minY + (height * i / 4);
        
        if ((nodeType === 'Event' || nodeType === 'Rule') && (i === 1 || i === 3)) {
            x = bbox.minX - offset * 1.5;
            const dx = x - centerX;
            const dy = y - centerY;
            
            if (nodeType === 'Event') {
                const shift = getEventShift(dx, dy, sizes.eventSize, 'left', i);
                x = centerX + shift.shiftX;
                y = centerY + shift.shiftY;
            } else if (nodeType === 'Rule') {
                const shift = getRuleShift(dx, dy, sizes.ruleSize, 'left', i);
                x = centerX + shift.shiftX;
                y = centerY + shift.shiftY;
            }
            if (i === 1) y = y - offset * 0.5;
            if (i === 3) y = y + offset * 0.5;
        }
        
        anchors[`left-${i}`] = { x, y };
    }

    // Right edge - 3 anchors
    for (let i = 1; i <= 3; i++) {
        let x = bbox.maxX + offset;
        let y = bbox.minY + (height * i / 4);
        
        if ((nodeType === 'Event' || nodeType === 'Rule') && (i === 1 || i === 3)) {
            x = bbox.maxX + offset * 1.5;
            const dx = x - centerX;
            const dy = y - centerY;
            
            if (nodeType === 'Event') {
                const shift = getEventShift(dx, dy, sizes.eventSize, 'right', i);
                x = centerX + shift.shiftX;
                y = centerY + shift.shiftY;
            } else if (nodeType === 'Rule') {
                const shift = getRuleShift(dx, dy, sizes.ruleSize, 'right', i);
                x = centerX + shift.shiftX;
                y = centerY + shift.shiftY;
            }
            if (i === 1) y = y - offset * 0.5;
            if (i === 3) y = y + offset * 0.5;
        }
        
        anchors[`right-${i}`] = { x, y };
    }
    
    return anchors;
}

/**
 * Draws anchor handles along the edges of a bounding box.
 * Places 3 circular handles on each edge (top, bottom, left, right).
 * For Event and Rule types, handles at 1/4 and 3/4 positions are shifted to touch the shape.
 * 
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} bbox - Bounding box with minX, maxX, minY, maxY
 * @param {string} fillColor - Fill color for the anchor circles
 * @param {string} nodeType - Type of the node ('Event', 'Task', or 'Rule')
 * @param {number} centerX - X coordinate of node center
 * @param {number} centerY - Y coordinate of node center
 * @param {Object} sizes - Size configuration for different node types
 */
function drawAnchorHandles(ctx, bbox, fillColor, nodeType, centerX, centerY, sizes) {
    const anchors = calculateAnchorHandles(bbox, nodeType, centerX, centerY, sizes);
    const radius = ANCHOR_HANDLE_DIAMETER * 0.5;
    
    // Draw all anchor handles
    Object.values(anchors).forEach(anchor => {
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = HANDLE_STROKE_COLOR;
        ctx.lineWidth = HANDLE_STROKE_WIDTH;
        ctx.stroke();
    });
}

/**
 * Draws selection handles (corners and anchors) around a node.
 * 
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} node - The node to draw handles for
 * @param {Object} sizes - Size configuration for different node types
 * @param {Object} colors - Color configuration
 */
function drawNodeHandles(ctx, node, sizes, colors) {
    const bbox = getNodeBoundingBox(node, sizes);
    drawCornerHandles(ctx, bbox, colors.Stroke);
    drawAnchorHandles(ctx, bbox, HANDLE_BACK_COLOR, node.type, node.x, node.y, sizes);
}

if (typeof module !== 'undefined') {
    module.exports = { getXOffset, drawWrappedText, drawNode, drawUnifiedArrow, render, getNodeBoundingBox, calculateAnchorHandles, drawNodeHandles };
}
