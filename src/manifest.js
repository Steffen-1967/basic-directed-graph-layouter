/**
 * @typedef {Object} ProcessNode
 * @property {string} id - Unique identifier (GUID)
 * @property {'Event' | 'Task' | 'Rule' | 'SubProcess'} type - Type of the node
 * @property {string} name - Short title
 * @property {string[]} predecessorIds - IDs of incoming connections
 * @property {string[]} successorIds - IDs of outgoing connections
 * @property {string} [description] - Detailed text (optional)
 * @property {number} [x] - Calculated X coordinate (optional)
 * @property {number} [y] - Calculated Y coordinate (optional)
 * @property {number} [level] - Calculated depth level (optional)
 * @property {boolean} [isTopRow] - Routing flag for primary path (optional)
 */

/**
 * Central configuration object for the process visualization.
 * Contains all layout parameters, node sizes, and color definitions.
 */
const CONFIG = {
    colors: {
        Event: '#F8E1F1',
        Rule: '#FFFACD',
        Task: '#D4EDDA',
        SubProcess: '#FFFFFF',
        Stroke: '#495057',
        Text: '#212529',
        Arrow: '#888',
        AnchorHandle: '#8c97ff',
        AnchorHandleHover: '#ADD8E6'
    },
    sizes: {
        taskWidth: 110,
        taskHeight: 65,
        eventSize: 45,
        ruleSize: 45,
        subProcessWidth: 110,
        subProcessHeight: 65,
        subProcessSquareSize: 12,
        eventHandleShiftOnSize1: 0.07,
        eventHandleShiftOnSize2: 0.27,
        ruleHandleShiftOnSize1: 0.17,
        ruleHandleShiftOnSize2: 0.34
    },
    colW: 140,
    rowH: 100
};

if (typeof module !== 'undefined') {
    module.exports = { CONFIG };
}
