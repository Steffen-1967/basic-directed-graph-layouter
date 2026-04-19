/**
 * @file envelopeService.ts
 * @description Central service for validating and transforming envelope structures 
 * for different persistence providers (FS, AGE, Firebase).
 */

import { GraphNode, GraphEdge, EdgeType, VersionableType, Envelope, getLangValue } from '@/manifest';
import { GraphTransformer } from './graphTransformer';
import ServerLogger from './logger';

const logger = new ServerLogger('ENVELOPE_SERVICE');

export interface ValidationError {
    nodeId: string;
    nodeName: string;
    field: string;
    message: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export interface FlattenedGraph {
    nodes: any[];
    edges: any[];
}

export class EnvelopeService {

    /**
     * Validates an envelope before persistence.
     */
    static validate(envelope: Envelope): ValidationResult {
        const errors: ValidationError[] = [];
        const seenIds = new Set<string>();

        const addError = (nodeId: string, nodeName: string, field: string, message: string) => {
            errors.push({ nodeId, nodeName, field, message });
        };

        const collectAndCheck = (nodes: GraphNode[], parent?: GraphNode) => {
            for (const node of nodes) {
                const nodeName = getLangValue(node.name);
                
                // ID Check
                if (seenIds.has(node.id)) {
                    addError(node.id, nodeName, 'id', `Duplicate node ID: ${node.id}`);
                }
                seenIds.add(node.id);

                // Versioning Logic Check
                if (node.versionable === VersionableType.Independently) {
                    if (!node.version || !/^\d+\.\d+(\.\d+)?$/.test(String(node.version))) {
                        addError(node.id, nodeName, 'version', `Invalid version format: '${node.version}'`);
                    }
                } else if (node.versionable === VersionableType.ByParent) {
                    if (!parent || parent.versionable !== VersionableType.Independently) {
                        addError(node.id, nodeName, 'versionable', "ByParent versioning requires an Independent parent");
                    }
                }

                if (node.nodes && Array.isArray(node.nodes)) {
                    collectAndCheck(node.nodes, node);
                }
            }
        };

        if (envelope.nodes) collectAndCheck(envelope.nodes);

        return { valid: errors.length === 0, errors };
    }

    /**
     * Flattens a nested envelope structure into flat arrays of node and edge objects.
     * Ready for Firestore or AGE.
     */
    static flatten(envelope: Envelope, envelopeId: string): FlattenedGraph {
        const flatNodes: any[] = [];
        const flatEdges: any[] = [];
        
        const processNode = (node: GraphNode, parentId?: string) => {
            // 1. Create the flat node representation
            const flatNode: any = {
                id: node.id,
                envelopeId: envelopeId,
                parentId: parentId || null,
                type: node.type,
                name: node.name,
                description: node.description || null,
                version: node.version || null,
                versionable: node.versionable || 'no',
                locked: !!node.locked,
                layoutType: (node as any).layoutType || null,
                layoutPreferences: (node as any).layoutPreferences || null,
                x: node._x || 0,
                y: node._y || 0,
                ext: (node as any).ext || {} // The universal JSON field
            };
            flatNodes.push(flatNode);

            // 2. Structural Edge (Parent-Child)
            if (parentId) {
                flatEdges.push({
                    id: `${parentId}_to_${node.id}_parent`,
                    envelopeId: envelopeId,
                    fromId: parentId,
                    toId: node.id,
                    type: EdgeType.Parent,
                    weight: 6,
                    locked: true,
                    ext: {}
                });
            }

            // 3. Process Outgoing Edges
            if (node.outgoing && Array.isArray(node.outgoing)) {
                node.outgoing.forEach(edge => {
                    flatEdges.push({
                        id: edge.id || `${node.id}_to_${edge.id}_${edge.type}`,
                        envelopeId: envelopeId,
                        fromId: node.id,
                        toId: edge.id,
                        type: edge.type || 'default',
                        weight: edge.weight || 1,
                        description: edge.description || null,
                        locked: !!edge.locked,
                        ext: (edge as any).ext || {} // The universal JSON field for edges
                    });
                });
            }

            // 4. Recursive Step
            if (node.nodes && Array.isArray(node.nodes)) {
                node.nodes.forEach(child => processNode(child, node.id));
            }
        };

        if (envelope.nodes) {
            envelope.nodes.forEach(node => processNode(node));
        }

        return { nodes: flatNodes, edges: flatEdges };
    }

    /**
     * Reconstructs a nested envelope structure from flat arrays of nodes and edges.
     */
    static reconstruct(envelopeMeta: any, flatNodes: any[], flatEdges: any[]): Envelope {
        const nodeMap = new Map<string, GraphNode>();

        // 1. Create Domain Objects
        flatNodes.forEach(fn => {
            const node: GraphNode = {
                id: fn.id,
                type: fn.type,
                name: fn.name,
                description: fn.description,
                version: fn.version,
                versionable: fn.versionable,
                locked: fn.locked,
                _x: fn.x,
                _y: fn.y,
                incoming: [],
                outgoing: [],
                nodes: []
            };
            if (fn.layoutType) (node as any).layoutType = fn.layoutType;
            if (fn.layoutPreferences) (node as any).layoutPreferences = fn.layoutPreferences;
            if (fn.ext) (node as any).ext = fn.ext;
            
            nodeMap.set(node.id, node);
        });

        // 2. Attach Edges
        flatEdges.forEach(fe => {
            const fromNode = nodeMap.get(fe.fromId);
            const toNode = nodeMap.get(fe.toId);

            if (fromNode && toNode) {
                if (fe.type === EdgeType.Parent) {
                    if (!fromNode.nodes) fromNode.nodes = [];
                    // Avoid duplicates in hierarchy
                    if (!fromNode.nodes.find(n => n.id === toNode.id)) {
                        fromNode.nodes.push(toNode);
                    }
                } else {
                    const edge: GraphEdge = {
                        id: toNode.id,
                        type: fe.type,
                        weight: fe.weight,
                        description: fe.description,
                        locked: fe.locked
                    };
                    if (fe.ext) (edge as any).ext = fe.ext;
                    
                    fromNode.outgoing!.push(edge);
                    toNode.incoming!.push({ ...edge, id: fromNode.id });
                }
            }
        });

        // 3. Identify Root Nodes (those without a parent edge in our flat list)
        const childIds = new Set(flatEdges.filter(e => e.type === EdgeType.Parent).map(e => e.toId));
        const rootNodes = flatNodes.filter(fn => !childIds.has(fn.id)).map(fn => nodeMap.get(fn.id)!);

        return {
            exporter: "mylife.org v0.2",
            id: envelopeMeta.id,
            name: envelopeMeta.name,
            description: envelopeMeta.description,
            layoutType: envelopeMeta.layoutType,
            layoutPreferences: envelopeMeta.layoutPreferences,
            root: envelopeMeta.root,
            nodes: rootNodes
        };
    }
}
