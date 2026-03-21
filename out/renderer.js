// Handle rendering constants
const HANDLE_OFFSET = 2;
const CORNER_HANDLE_SIZE = 10;
const ANCHOR_HANDLE_DIAMETER = 10;
const HANDLE_STROKE_COLOR = '#6c75ad';
const HANDLE_STROKE_WIDTH = 2;

/**
 * Calculates the horizontal offset from the bonding box center of a node
 * to its anchor point. This is used for precise arrow positioning.
 * 
 * @param {Object} node - The node object containing type information
 * @param {Object} sizes - Configuration object with node dimensions
 * @param {number} sizes.taskWidth - Width of task nodes
 * @param {number} sizes.subProcessWidth - Width of sub process nodes
 * @param {number} sizes.eventSize - Diameter of event nodes
 * @param {number} sizes.ruleSize - Diagonal size of rule nodes (diamond)
 * @param {string} side - The symbol side (top, bottom, left or right)
 * @returns {number} The horizontal distance from node center to its anchor point
 */
function calculateHandleOffsetX(node, sizes, side, handleIndex) {
    if (node.type === 'Task') {
		if ((side ===  `top`) || (side ===  `bottom`)) {
			if (handleIndex === 1)
				return - sizes.taskWidth * 0.25;
			else if (handleIndex === 3)
				return sizes.taskWidth * 0.25;
			return 0;
		}
		else if (side ===  `left`)
			return - sizes.taskWidth * 0.5;
		else if (side ===  `right`)
			return sizes.taskWidth * 0.5;
    }
    else if (node.type === 'SubProcess') {
		if ((side ===  `top`) || (side ===  `bottom`)) {
			if (handleIndex === 1)
				return - sizes.subProcessWidth * 0.25;
			else if (handleIndex === 3)
				return sizes.subProcessWidth * 0.25;
			return 0;
		}
		else if (side ===  `left`)
			return - sizes.subProcessWidth * 0.5;
		else if (side ===  `right`)
			return sizes.subProcessWidth * 0.5;
    }
    else if (node.type === 'Event') {
		if ((side ===  `top`) || (side ===  `bottom`)) {
			if (handleIndex === 1)
				return - sizes.eventSize * sizes.eventHandleShiftOnSize2;
			else if (handleIndex === 3)
				return sizes.eventSize * sizes.eventHandleShiftOnSize2;
			return 0;
		}
		else if (side ===  `left`) {
			if ((handleIndex === 1) || (handleIndex === 3))
				return - sizes.eventSize * (0.5 - sizes.eventHandleShiftOnSize1);
			return - sizes.eventSize * 0.5;
		}
		else if (side ===  `right`) {
			if ((handleIndex === 1) || (handleIndex === 3))
				return sizes.eventSize * (0.5 - sizes.eventHandleShiftOnSize1);
			return sizes.eventSize * 0.5;
		}
    }
	else if (node.type === 'Rule') {
		if ((side ===  `top`) || (side ===  `bottom`)) {
			if (handleIndex === 1)
				return - sizes.ruleSize * sizes.ruleHandleShiftOnSize2;
			if (handleIndex === 3)
				return sizes.ruleSize * sizes.ruleHandleShiftOnSize2;
			return 0;
		}
		else if (side ===  `left`) {
			if ((handleIndex === 1) || (handleIndex === 3))
				return - sizes.ruleSize * (0.5 - sizes.ruleHandleShiftOnSize1);
			return - sizes.ruleSize * 0.5;
		}
		else if (side ===  `right`) {
			if ((handleIndex === 1) || (handleIndex === 3))
				return sizes.ruleSize * (0.5 - sizes.ruleHandleShiftOnSize1);
			return sizes.ruleSize * 0.5;
		}
    }
	return 0;
}

/**
 * Calculates the vertical offset from the bonding box center of a node
 * to its anchor point. This is used for precise arrow positioning.
 * 
 * @param {Object} node - The node object containing type information
 * @param {Object} sizes - Configuration object with node dimensions
 * @param {number} sizes.taskHeight - Height of task nodes
 * @param {number} sizes.subProcessHeight - Height of sub process nodes
 * @param {number} sizes.eventSize - Diameter of event nodes
 * @param {number} sizes.ruleSize - Diagonal size of rule nodes (diamond)
 * @param {string} side - The symbol side (top, bottom, left or right)
 * @returns {number} The vertical distance from node center to its anchor point
 */
function calculateHandleOffsetY(node, sizes, side, handleIndex) {
    if (node.type === 'Task') {
		if ((side ===  `left`) || (side ===  `right`)) {
			if (handleIndex === 1)
				return - sizes.taskHeight * 0.25;
			else if (handleIndex === 3)
				return sizes.taskHeight * 0.25;
			return 0;
		}
		else if (side ===  `top`)
			return - sizes.taskHeight * 0.5;
		else if (side ===  `bottom`)
			return sizes.taskHeight * 0.5;
    }
    else if (node.type === 'SubProcess') {
		if ((side ===  `left`) || (side ===  `right`)) {
			if (handleIndex === 1)
				return - sizes.subProcessHeight * 0.25;
			else if (handleIndex === 3)
				return sizes.subProcessHeight * 0.25;
			return 0;
		}
		else if (side ===  `top`)
			return - sizes.subProcessHeight * 0.5;
		else if (side ===  `bottom`)
			return sizes.subProcessHeight * 0.5;
    }
    else if (node.type === 'Event') {
		if ((side ===  `left`) || (side ===  `right`)) {
			if (handleIndex === 1)
				return - sizes.eventSize * sizes.eventHandleShiftOnSize2;
			else if (handleIndex === 3)
				return sizes.eventSize * sizes.eventHandleShiftOnSize2;
			return 0;
		}
		else if (side ===  `top`) {
			if ((handleIndex === 1) || (handleIndex === 3))
				return - sizes.eventSize * (0.5 - sizes.eventHandleShiftOnSize1);
			return - sizes.eventSize * 0.5;
		}
		else if (side ===  `bottom`) {
			if ((handleIndex === 1) || (handleIndex === 3))
				return sizes.eventSize * (0.5 - sizes.eventHandleShiftOnSize1);
			return sizes.eventSize * 0.5;
		}
    }
	else if (node.type === 'Rule') {
		if ((side ===  `left`) || (side ===  `right`)) {
			if (handleIndex === 1)
				return - sizes.ruleSize * sizes.ruleHandleShiftOnSize1;
			if (handleIndex === 3)
				return sizes.ruleSize * sizes.ruleHandleShiftOnSize1;
			return 0;
		}
		else if (side ===  `top`) {
			if ((handleIndex === 1) || (handleIndex === 3))
				return - sizes.ruleSize * (0.5 - sizes.ruleHandleShiftOnSize2);
			return - sizes.ruleSize * 0.5;
		}
		else if (side ===  `bottom`) {
			if ((handleIndex === 1) || (handleIndex === 3))
				return sizes.ruleSize * (0.5 - sizes.ruleHandleShiftOnSize2);
			return sizes.ruleSize * 0.5;
		}
    }
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
    ctx.font = '10px Arial';
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
    } else if (node.type === 'SubProcess') {
        const x = node.x - sizes.subProcessWidth * 0.5;
        const y = node.y - sizes.subProcessHeight * 0.5;
        ctx.beginPath();
        ctx.roundRect(x, y, sizes.subProcessWidth, sizes.subProcessHeight, 10);
        ctx.fillStyle = colors.SubProcess;
        ctx.fill();
        ctx.strokeStyle = colors.Stroke;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Draw small square at bottom center (unfilled, with border)
        const squareSize = sizes.subProcessSquareSize;
        const squareX = node.x - squareSize * 0.5;
        const squareY = y + sizes.subProcessHeight - squareSize - 5;
        ctx.beginPath();
        ctx.rect(squareX, squareY, squareSize, squareSize);
        ctx.strokeStyle = colors.Stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw "+" inside the square
        const plusSize = squareSize * 0.6;
        const centerX = squareX + squareSize * 0.5;
        const centerY = squareY + squareSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(centerX - plusSize * 0.5, centerY);
        ctx.lineTo(centerX + plusSize * 0.5, centerY);
        ctx.moveTo(centerX, centerY - plusSize * 0.5);
        ctx.lineTo(centerX, centerY + plusSize * 0.5);
        ctx.strokeStyle = colors.Stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        drawWrappedText(ctx, node.name, node.x, node.y, sizes.subProcessWidth - 10, 3, colors, true);
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
 * @param {Object} sizes - Size configuration for different node types
 * @param {string} toNode.type - Type of target node
 * @param {Object} colors - Color configuration
 * @param {number} lvlW - Column width (horizontal spacing between levels)
 * @param {number} rowH - Row height (vertical spacing between rows)
 */
function drawUnifiedArrow(ctx, fromNode, toNode, sizes, colors, lvlW, rowH) {
    const headLength = 10;
    
    let handleIndex = 2;
	if (fromNode.y > toNode.y)
		handleIndex = 1;
	if (fromNode.y < toNode.y)
		handleIndex = 3;
	let startY1 = fromNode.y + calculateHandleOffsetY(fromNode, sizes, `right`, handleIndex);
    
	handleIndex = 2;
	if (fromNode.y > toNode.y)
		handleIndex = 1;
	if (fromNode.y < toNode.y)
		handleIndex = 3;
    let startX1 = fromNode.x + calculateHandleOffsetX(fromNode, sizes, `right`, handleIndex);

    handleIndex = 2;
	if (fromNode.y < toNode.y)
		handleIndex = 1;
	if (fromNode.y > toNode.y)
		handleIndex = 3;
    let endY2 = toNode.y + calculateHandleOffsetY(toNode, sizes, `left`, handleIndex);
    
    handleIndex = 2;
	if (fromNode.y < toNode.y)
		handleIndex = 1;
	if (fromNode.y > toNode.y)
		handleIndex = 3;
    let endX2 = toNode.x + calculateHandleOffsetX(toNode, sizes, `left`, handleIndex);

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
 * @param {Object} sizes - Size configuration for all node types
 * @param {Object} colors - Color configuration for all visual elements
 * @param {number} lvlW - Column width (horizontal spacing)
 * @param {number} rowH - Row height (vertical spacing)
 */
function render(ctx, canvas, offsetX, offsetY, nodes, sizes, colors, lvlW, rowH) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(offsetX, offsetY);
    
    nodes.forEach(node => drawNode(ctx, node, colors, sizes));
    
    nodes.forEach(node => {
        if (node.predecessorIds) {
            node.predecessorIds.forEach(predId => {
                const predNode = nodes.find(n => n.id === predId);
                if (predNode) {
                    drawUnifiedArrow(ctx, predNode, node, sizes, colors, lvlW, rowH);
                }
            });
        }
    });
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
    } else if (node.type === 'SubProcess') {
        minX = node.x - sizes.subProcessWidth * 0.5;
        maxX = node.x + sizes.subProcessWidth * 0.5;
        minY = node.y - sizes.subProcessHeight * 0.5;
        maxY = node.y + sizes.subProcessHeight * 0.5;
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
 */
function drawCornerHandles(ctx, bbox) {
    const offset = HANDLE_OFFSET;
    const size = CORNER_HANDLE_SIZE;
    
    ctx.strokeStyle = HANDLE_STROKE_COLOR;
    ctx.lineWidth = HANDLE_STROKE_WIDTH * 2;

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
    const offset = HANDLE_OFFSET * 2;
    const width = bbox.maxX - bbox.minX;
    const height = bbox.maxY - bbox.minY;
	
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
				if (handleIndex === 1)
					x = bbox.minX + (width * sizes.eventHandleShiftOnSize2) - (offset * eventHandleShiftAnchor2);
				else if (handleIndex === 3)
					x = bbox.maxX - (width * sizes.eventHandleShiftOnSize2) + (offset * eventHandleShiftAnchor2);
			}
			else if (nodeType === 'Rule') {
				y = bbox.minY + (height * sizes.ruleHandleShiftOnSize1) - (offset * ruleHandleShiftAnchor1);
				if (handleIndex === 1)
					x = bbox.minX + (width * sizes.ruleHandleShiftOnSize2) - (offset * ruleHandleShiftAnchor2);
				else if (handleIndex === 3)
					x = bbox.maxX - (width * sizes.ruleHandleShiftOnSize2) + (offset * ruleHandleShiftAnchor2);
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
				if (handleIndex === 1)
					x = bbox.minX + (width * sizes.eventHandleShiftOnSize2) - (offset * eventHandleShiftAnchor2);
				else if (handleIndex === 3)
					x = bbox.maxX - (width * sizes.eventHandleShiftOnSize2) + (offset * eventHandleShiftAnchor2);
			}
			else if (nodeType === 'Rule') {
				y = bbox.maxY - (height * sizes.ruleHandleShiftOnSize1) + (offset * ruleHandleShiftAnchor1);
				if (handleIndex === 1)
					x = bbox.minX + (width * sizes.ruleHandleShiftOnSize2) - (offset * ruleHandleShiftAnchor2);
				else if (handleIndex === 3)
					x = bbox.maxX - (width * sizes.ruleHandleShiftOnSize2) + (offset * ruleHandleShiftAnchor2);
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
				if (handleIndex === 1)
					y = bbox.minY + (height * sizes.eventHandleShiftOnSize2) - (offset * eventHandleShiftAnchor2);
				else if (handleIndex === 3)
					y = bbox.maxY - (height * sizes.eventHandleShiftOnSize2) + (offset * eventHandleShiftAnchor2);
			}
			else if (nodeType === 'Rule') {
				x = bbox.minX + (width * sizes.ruleHandleShiftOnSize1) - (offset * ruleHandleShiftAnchor1);
				if (handleIndex === 1)
					y = bbox.minY + (height * sizes.ruleHandleShiftOnSize2) - (offset * ruleHandleShiftAnchor2);
				else if (handleIndex === 3)
					y = bbox.maxY - (height * sizes.ruleHandleShiftOnSize2) + (offset * ruleHandleShiftAnchor2);
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
				if (handleIndex === 1)
					y = bbox.minY + (height * sizes.eventHandleShiftOnSize2) - (offset * eventHandleShiftAnchor2);
				else if (handleIndex === 3)
					y = bbox.maxY - (height * sizes.eventHandleShiftOnSize2) + (offset * eventHandleShiftAnchor2);
			}
			else if (nodeType === 'Rule') {
				x = bbox.maxX - (width * sizes.ruleHandleShiftOnSize1) + (offset * ruleHandleShiftAnchor1);
				if (handleIndex === 1)
					y = bbox.minY + (height * sizes.ruleHandleShiftOnSize2) - (offset * ruleHandleShiftAnchor2);
				else if (handleIndex === 3)
					y = bbox.maxY - (height * sizes.ruleHandleShiftOnSize2) + (offset * ruleHandleShiftAnchor2);
			}
       }
        
        anchors[`right-${handleIndex}`] = { x, y };
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
 * @param {string} nodeType - Type of the node ('Event', 'Task', or 'Rule')
 * @param {number} centerX - X coordinate of node center
 * @param {number} centerY - Y coordinate of node center
 * @param {Object} sizes - Size configuration for different node types
 * @param {Object} colors - Color configuration
 * @param {string|null} hoveredHandle - Key of the hovered handle (e.g., "top-1") or null
 */
function drawAnchorHandles(ctx, bbox, nodeType, centerX, centerY, sizes, colors, hoveredHandle = null) {
    const anchors = calculateAnchorHandles(bbox, nodeType, centerX, centerY, sizes);
    
    // Draw all anchor handles
    Object.entries(anchors).forEach(([key, anchor]) => {
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, ANCHOR_HANDLE_DIAMETER * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = (hoveredHandle === key) ? colors.AnchorHandleHover : colors.AnchorHandle;
        ctx.fill();
        ctx.strokeStyle = HANDLE_STROKE_COLOR;
        ctx.lineWidth = HANDLE_STROKE_WIDTH * 0.75;
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
 * @param {string|null} hoveredHandle - Key of the hovered handle (e.g., "top-1") or null
 */
function drawNodeHandles(ctx, node, sizes, colors, hoveredHandle = null) {
    const bbox = getNodeBoundingBox(node, sizes);
    drawCornerHandles(ctx, bbox);
    drawAnchorHandles(ctx, bbox, node.type, node.x, node.y, sizes, colors, hoveredHandle);
}

if (typeof module !== 'undefined') {
    module.exports = { calculateHandleOffsetX, drawWrappedText, drawNode, drawUnifiedArrow, render, getNodeBoundingBox, calculateAnchorHandles, drawNodeHandles };
}
