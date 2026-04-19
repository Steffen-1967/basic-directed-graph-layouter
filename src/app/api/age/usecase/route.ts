import { NextRequest, NextResponse } from 'next/server';
import { Client, dbConfig, ensureAgeReady, executeCypher, GRAPH_NAME, PGClient } from '@/lib/server/db';
import { GraphTransformer, AGENode, AGEEdge } from '@/lib/server/graphTransformer';
import { GraphNode, EdgeType, VersionableType, Envelope, getLangValue } from '@/manifest';
import ServerLogger from '@/lib/server/logger';

const logger = new ServerLogger('AGE');

interface ValidationError { nodeId: string; nodeName: string; field: string; message: string; }
interface ValidationResult { valid: boolean; errors: ValidationError[]; }

/**
 * Validates nodes before persistence. 
 */
async function validateNodesPhase1(nodes: GraphNode[], client?: PGClient): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const seenIds = new Set<string>();

    const addError = (nodeId: string, nodeName: string, field: string, message: string) => {
        const err = { nodeId, nodeName, field, message };
        errors.push(err);
        if (logger) logger.error('AGE', `Validation error: ${message}`, err);
    };

    interface NodeWithParent { node: GraphNode; parent?: GraphNode; }
    const allNodesWithParents: NodeWithParent[] = [];
    const collectNodes = (nodeList: GraphNode[], parent?: GraphNode) => {
        nodeList.forEach(node => {
            allNodesWithParents.push({ node, parent });
            if (node.nodes && Array.isArray(node.nodes)) collectNodes(node.nodes, node);
        });
    };
    collectNodes(nodes);

    for (const { node } of allNodesWithParents) {
        if (seenIds.has(node.id)) addError(node.id, getLangValue(node.name), 'id', `Duplicate node ID: ${node.id}`);
        seenIds.add(node.id);
    }

    for (const { node, parent } of allNodesWithParents) {
        const nodeName = getLangValue(node.name);
        if (node.versionable === VersionableType.Independently) {
            if (!node.version || !/^\d+\.\d$/.test(String(node.version))) {
                addError(node.id, nodeName, 'version', `Invalid version: '${node.version}'`);
            }
        } else if (node.versionable === VersionableType.ByParent && (!parent || parent.versionable !== VersionableType.Independently)) {
            addError(node.id, nodeName, 'versionable', "Invalid versioning hierarchy");
        }
    }

    if (errors.length > 0) return { valid: false, errors };
    return { valid: true, errors: [] };
}

/**
 * Transforms a nested node structure into flat arrays of AGENode and AGEEdge objects.
 */
function prepareGraphForPersistence(nodes: GraphNode[]): { ageNodes: AGENode[], ageEdges: AGEEdge[] } {
    const ageNodes: AGENode[] = [];
    const ageEdges: AGEEdge[] = [];
    const flattenedNodes: GraphNode[] = [];
    
    const flattenNode = (node: GraphNode, parentId?: string) => {
        flattenedNodes.push(node);
        if (parentId) ageEdges.push(GraphTransformer.toPersistenceEdge(parentId, node.id, { type: EdgeType.Parent, weight: 6 } as any));
        if (node.nodes && Array.isArray(node.nodes)) node.nodes.forEach(child => flattenNode(child, node.id));
    };
    
    nodes.forEach(node => flattenNode(node));
    
    flattenedNodes.forEach(node => {
        ageNodes.push(GraphTransformer.toPersistenceNode(node));
        if (node.incoming) node.incoming.forEach(edge => ageEdges.push(GraphTransformer.toPersistenceEdge(edge.id, node.id, edge)));
        if (node.outgoing) node.outgoing.forEach(edge => {
            const label = GraphTransformer.sanitizeLabel(edge.type || 'default');
            if (!ageEdges.some(e => e.from === node.id && e.to === edge.id && e.label === label)) {
                ageEdges.push(GraphTransformer.toPersistenceEdge(node.id, edge.id, edge));
            }
        });
    });
    return { ageNodes, ageEdges };
}

export async function POST(request: NextRequest) {
    const envelope: Envelope = await request.json();
    const client = new Client(dbConfig);
    try {
        await client.connect();
        await ensureAgeReady(client, true); 
        
        const p1 = await validateNodesPhase1(envelope.nodes, client);
        if (!p1.valid) {
            return NextResponse.json({ success: false, error: 'Validation failed', validationErrors: p1.errors }, { status: 400 });
        }

        const { ageNodes, ageEdges } = prepareGraphForPersistence(envelope.nodes);
        
        await client.query('BEGIN');
        for (const n of ageNodes) {
            const props = Object.entries(n.properties).map(([k, v]) => `n.${k} = ${GraphTransformer.toCypherValue(v)}`).join(', ');
            await client.query(`SELECT * FROM cypher('${GRAPH_NAME}', $$ MERGE (n:${n.label} {id: '${n.id}'}) WITH n WHERE coalesce(n.locked, false) = false SET ${props} RETURN n $$) as (n agtype);`);
        }
        for (const e of ageEdges) {
            const props = Object.entries(e.properties).map(([k, v]) => `r.${k} = ${GraphTransformer.toCypherValue(v)}`).join(', ');
            await client.query(`SELECT * FROM cypher('${GRAPH_NAME}', $$ MATCH (a {id: '${e.from}'}), (b {id: '${e.to}'}) MERGE (a)-[r:${e.label}]->(b) WITH r WHERE coalesce(r.locked, false) = false SET ${props} RETURN r $$) as (r agtype);`);
        }
        await client.query('COMMIT');
        
        logger.info('SAVE', 'Usecase saved to database', { nodeCount: ageNodes.length, edgeCount: ageEdges.length });
        return NextResponse.json({ success: true, stats: { nodes: ageNodes.length, edges: ageEdges.length } });
    } catch (error: any) {
        if (client) await client.query('ROLLBACK');
        logger.error('SAVE', 'Failed to save usecase', { error: error.message });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        await client.end();
    }
}
