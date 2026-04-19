/**
 * @file graphTransformer.ts
 * @description Centralized data mapper for converting between Domain Objects (GraphNode/GraphEdge) 
 * and Persistence Objects (Apache AGE / Cypher).
 */

import { GraphNode, GraphEdge, MultiLangProp, Envelope, LayoutType } from '@/manifest';

/**
 * Interface for internal AGE-compatible node structure.
 */
export interface AGENode {
    id: string;
    label: string;
    properties: Record<string, any>;
}

/**
 * Interface for internal AGE-compatible edge structure.
 */
export interface AGEEdge {
    from: string;
    to: string;
    label: string;
    properties: Record<string, any>;
}

export class GraphTransformer {

    // ========================================================================
    // DOMAIN -> PERSISTENCE (Writing)
    // ========================================================================

    static toPersistenceNode(node: GraphNode): AGENode {
        return {
            id: node.id,
            label: this.sanitizeLabel(node.type),
            properties: {
                id: node.id,
                type: node.type,
                name: JSON.stringify(node.name),
                description: node.description ? JSON.stringify(node.description) : null,
                versionable: node.versionable || 'no',
                version: node.version || null,
                versionContainer: node.versionContainer || null,
                locked: !!node.locked,
                layoutType: (node as any).layoutType || null,
                layoutPreferences: (node as any).layoutPreferences ? JSON.stringify((node as any).layoutPreferences) : null
            }
        };
    }

    static toPersistenceEdge(fromId: string, toId: string, edge: GraphEdge): AGEEdge {
        return {
            from: fromId,
            to: toId,
            label: this.sanitizeLabel(edge.type || 'default'),
            properties: {
                type: edge.type || 'default',
                weight: edge.weight || 1,
                description: edge.description ? JSON.stringify(edge.description) : null,
                locked: !!edge.locked
            }
        };
    }

    // ========================================================================
    // PERSISTENCE -> DOMAIN (Reading)
    // ========================================================================

    static toDomainNode(props: any): GraphNode {
        if (!props) throw new Error('Transformer: No properties provided for domain conversion');

        const node: any = {
            id: props.id || 'missing-id',
            type: props.type || 'unknown',
            name: this.parseMultiLang(props.name),
            description: this.parseMultiLang(props.description),
            versionable: props.versionable || 'no',
            version: props.version || '',
            versionContainer: props.versionContainer || null,
            locked: props.locked === true || props.locked === 'true',
            incoming: [],
            outgoing: []
        };

        if (props.layoutType) node.layoutType = props.layoutType;
        if (props.layoutPreferences) {
            try {
                node.layoutPreferences = typeof props.layoutPreferences === 'string' ? JSON.parse(props.layoutPreferences) : props.layoutPreferences;
            } catch(e) {}
        }

        return node;
    }

    static toDomainEdge(props: any, targetId: string): GraphEdge {
        return {
            id: targetId,
            type: props.type || 'default',
            weight: Number(props.weight) || 1,
            description: this.parseMultiLang(props.description),
            locked: props.locked === true || props.locked === 'true'
        };
    }

    static toEnvelope(nodes: GraphNode[], name: string = "GraphDbQuery", description: string = "Query result that contains all scenarios"): Envelope {
        const rootNode: any = nodes.length > 0 ? nodes[0] : {};
        return {
            exporter: "mylife.org v0.2",
            name: [{ lcid: 1031, value: name }],
            description: [{ lcid: 1031, value: description }],
            layoutType: rootNode.layoutType || LayoutType.Flow,
            layoutPreferences: rootNode.layoutPreferences || {},
            root: rootNode.id || "",
            nodes: nodes
        };
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    static sanitizeLabel(label: string): string {
        return (label || 'default').replace(/[^a-zA-Z0-9_]/g, '_');
    }

    static toCypherValue(value: any): string {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'boolean') return `${value}::agtype`;
        if (typeof value === 'number') {
            return Number.isFinite(value) ? `${value}::agtype` : 'null';
        }
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "\\'")}'::agtype`;
        }
        return `'${JSON.stringify(value).replace(/'/g, "\\'")}'::agtype`;
    }

    private static parseMultiLang(val: any): MultiLangProp {
        if (!val) return [];
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [{ lcid: 1031, value: val }];
            } catch (e) {
                return [{ lcid: 1031, value: val }];
            }
        }
        return Array.isArray(val) ? val : [];
    }
}
