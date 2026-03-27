/**
 * @file manifest.ts
 * Central type definitions and configuration for the process visualization.
 */
/**
 * Central configuration object for the process visualization.
 * Contains all layout parameters, node sizes, and color definitions.
 */
export const CONFIG = {
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
    rowH: 100,
    interaction: {
        doubleClickDelay: 350
    }
};
// Also expose as global for browser if needed (legacy support during migration)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
