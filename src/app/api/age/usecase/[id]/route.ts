import { NextRequest, NextResponse } from 'next/server';
import { Client, dbConfig, ensureAgeReady, executeCypher, GRAPH_NAME, cleanId, PGClient } from '@/lib/server/db';
import { GraphTransformer } from '@/lib/server/graphTransformer';
import { GraphNode, isContainerType, isUseCase, isUseCaseContainable, isRepositoryContainable, isScenario, isScenarioContainable, isSubProcess, isSubProcessContainable } from '@/manifest';
import ServerLogger from '@/lib/server/logger';

const logger = new ServerLogger('AGE');

/**
 * Resolves internal relations between nodes in the provided Map.
 */
async function fetchGraphNodeListInternalRelations(nodesMap: Map<string, GraphNode>, client?: PGClient): Promise<{success: boolean, error?: string}> {
    if (!nodesMap || nodesMap.size === 0) return { success: true };
    try {
        const nodeIds: string[] = [];
        const indexMap = new Map<string, number>();
        let i = 0;
        for (const node of nodesMap.values()) {
            nodeIds.push(`'${node.id}'`);
            indexMap.set(node.id, i++);
        }
        const idList = nodeIds.join(', ');
        const query = `SELECT * FROM cypher('${GRAPH_NAME}', $$ MATCH (u)-[r]->(v) WHERE u.id IN [${idList}] AND v.id IN [${idList}] RETURN u.id, v.id, r.type, r.weight, r.description, r.locked $$) as (sourceid agtype, targetid agtype, r_type agtype, r_weight agtype, r_description agtype, r_locked agtype);`;
        const rows = await executeCypher(query, client);

        for (const row of rows) {
            const S_id = cleanId(row.sourceid), T_id = cleanId(row.targetid);
            const S_node = nodesMap.get(S_id), T_node = nodesMap.get(T_id);
            if (!S_node || !T_node) continue;
            const edgeType = row.r_type;
            if (T_node.incoming?.some(e => e.id === S_id && e.type === edgeType) || S_node.outgoing?.some(e => e.id === T_id && e.type === edgeType)) continue;

            const edgeData: any = { weight: row.r_weight || 1, type: edgeType, description: row.r_description, locked: row.r_locked || false };
            if (indexMap.get(S_id)! < indexMap.get(T_id)!) {
                if (!T_node.incoming) T_node.incoming = [];
                T_node.incoming.push({ ...edgeData, id: S_id });
            } else {
                if (!S_node.outgoing) S_node.outgoing = [];
                S_node.outgoing.push({ ...edgeData, id: T_id });
            }
        }
        return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
}

/**
 * Recursive traversal to fetch all reachable nodes and their relations.
 */
async function fetchGraphNodeRelatedById(mainGraphNode: GraphNode, initialAllLoadedNodes: Map<string, GraphNode>, releasedOnly: boolean, iterationCnt: number, recursion: boolean, client?: PGClient): Promise<{success: boolean, allLoadedNodes: Map<string, GraphNode>, newSiblingNodes: Map<string, GraphNode>, error?: string}> {
    try {
        const mainNodeId = mainGraphNode.id;
        const query = `SELECT * FROM cypher('${GRAPH_NAME}', $$ MATCH (u {id: '${mainNodeId}'})-[r]->(c) RETURN c.id, c.type, c.name, c.description, c.versionable, c.version, c.versionContainer, u.locked, r.type, r.weight, r.description, r.locked, u.id, c.id UNION ALL MATCH (u {id: '${mainNodeId}'})<-[r]-(c) RETURN c.id, c.type, c.name, c.description, c.versionable, c.version, c.versionContainer, u.locked, r.type, r.weight, r.description, r.locked, c.id, u.id $$) as (c_id agtype, c_type agtype, c_name agtype, c_description agtype, c_versionable agtype, c_version agtype, c_versioncontainer agtype, u_locked agtype, r_type agtype, r_weight agtype, r_description agtype, r_locked agtype, sourceid agtype, targetid agtype);`;
        const edgeRows = await executeCypher(query, client);

        const newUniqueNodesMap = new Map<string, GraphNode>();
        for (const row of edgeRows) {
            const counterpartId = cleanId(row.c_id), type = row.c_type;
            if (!counterpartId || !type) continue;
            if (isUseCase(mainGraphNode.type) && !isUseCaseContainable(type) && !isRepositoryContainable(type)) continue;
            if (isScenario(mainGraphNode.type) && !isScenarioContainable(type) && !isRepositoryContainable(type)) continue;
            if (isSubProcess(mainGraphNode.type) && !isSubProcessContainable(type) && !isRepositoryContainable(type)) continue;

            if (!initialAllLoadedNodes.has(counterpartId)) {
                const node = GraphTransformer.toDomainNode({ id: counterpartId, type, name: row.c_name, description: row.c_description, versionable: row.c_versionable, version: row.c_version, versionContainer: row.c_versioncontainer, locked: row.u_locked });
                newUniqueNodesMap.set(counterpartId, node);
                initialAllLoadedNodes.set(counterpartId, node);
            }

            const cNode = initialAllLoadedNodes.get(counterpartId)!, rowS = cleanId(row.sourceid), rowT = cleanId(row.targetid);
            const edge: any = { weight: row.r_weight || 1, type: row.r_type, description: row.r_description, locked: row.r_locked || false };
            if (cNode.id === rowT) {
                if (!cNode.incoming) cNode.incoming = [];
                cNode.incoming.push({ ...edge, id: rowS });
                if (rowS === mainNodeId) { if (!mainGraphNode.outgoing) mainGraphNode.outgoing = []; mainGraphNode.outgoing.push({ ...edge, id: rowT }); }
            } else {
                if (!cNode.outgoing) cNode.outgoing = [];
                cNode.outgoing.push({ ...edge, id: rowT });
                if (rowT === mainNodeId) { if (!mainGraphNode.incoming) mainGraphNode.incoming = []; mainGraphNode.incoming.push({ ...edge, id: rowS }); }
            }
        }

        const newSiblingMap = new Map<string, GraphNode>();
        if (iterationCnt === 1) {
            newUniqueNodesMap.forEach((n, id) => newSiblingMap.set(id, n));
        } else {
            const nodes = Array.from(newUniqueNodesMap.values());
            mainGraphNode.nodes = nodes.filter(n => isSubProcess(n.type) || isSubProcessContainable(n.type));
            nodes.filter(n => !isSubProcess(n.type) && !isSubProcessContainable(n.type)).forEach(n => newSiblingMap.set(n.id, n));
        }
        
        for (const sibling of newUniqueNodesMap.values()) {
            if (recursion && (isSubProcess(sibling.type) || isSubProcessContainable(sibling.type))) {
                const sub = await fetchGraphNodeRelatedById(sibling, initialAllLoadedNodes, releasedOnly, iterationCnt + 1, isSubProcess(sibling.type), client);
                if (sub.success) sub.newSiblingNodes.forEach((n, id) => newSiblingMap.set(id, n));
            }
        }
        return { success: true, allLoadedNodes: initialAllLoadedNodes, newSiblingNodes: newSiblingMap };
    } catch (e: any) { return { success: false, allLoadedNodes: initialAllLoadedNodes, newSiblingNodes: new Map(), error: e.message }; }
}

async function fetchUsecaseOrScenarioById(id: string, releasedOnly: boolean, client?: PGClient): Promise<{success: boolean, allLoadedNodes?: Map<string, GraphNode>, newSiblingNodes?: Map<string, GraphNode>, error?: string, status?: number}> {
    try {
        const query = `SELECT * FROM cypher('${GRAPH_NAME}', $$ MATCH (u {id: '${id}'}) RETURN u.id, u.type, u.name, u.description, u.versionable, u.version, u.versionContainer, u.locked $$) as (id agtype, type agtype, name agtype, description agtype, versionable agtype, version agtype, versionContainer agtype, locked agtype);`;
        const rows = await executeCypher(query, client);
        if (rows.length === 0) return { success: false, error: 'Node not found', status: 404 };
        let resNode = rows[0].props || rows[0];

        if (isContainerType(resNode.type)) {
            const vQuery = `SELECT * FROM cypher('${GRAPH_NAME}', $$ MATCH (v {versionContainer: '${id}'}) RETURN v.id, v.type, v.name, v.description, v.versionable, v.version, v.versionContainer, v.locked $$) as (id agtype, type agtype, name agtype, description agtype, versionable agtype, version agtype, versionContainer agtype, locked agtype);`;
            let versions = await executeCypher(vQuery, client);
            let vList = versions.map(v => v.props || v);
            if (releasedOnly) vList = vList.filter(v => String(v.version || '').endsWith('.0'));
            if (vList.length === 0) return { success: false, error: 'No version found', status: 404 };
            vList.sort((a, b) => {
                const pA = String(a.version).split('.').map(Number), pB = String(b.version).split('.').map(Number);
                for (let i=0; i<Math.max(pA.length, pB.length); i++) if ((pA[i]||0) !== (pB[i]||0)) return (pA[i]||0) - (pB[i]||0);
                return 0;
            });
            resNode = vList[vList.length-1]; resNode.id = cleanId(resNode.id);
        } else if (releasedOnly && !String(resNode.version).endsWith('.0')) return { success: false, error: 'Not released', status: 400 };

        const main = GraphTransformer.toDomainNode(resNode);
        const allMap = new Map<string, GraphNode>(); allMap.set(main.id, main);
        const res = await fetchGraphNodeRelatedById(main, allMap, releasedOnly, 1, true, client);
        if (res.success) {
            const repoMap = new Map<string, GraphNode>();
            res.newSiblingNodes.forEach((n, id) => { if (isRepositoryContainable(n.type)) repoMap.set(id, n); });
            await fetchGraphNodeListInternalRelations(repoMap, client);
            return { success: true, allLoadedNodes: res.allLoadedNodes, newSiblingNodes: res.newSiblingNodes };
        }
        return { success: false, error: res.error };
    } catch (e: any) { return { success: false, error: e.message, status: 500 }; }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const id = (await params).id;
    const releasedOnly = request.nextUrl.searchParams.get('releasedOnly') === 'true';
    const client = new Client(dbConfig);
    try {
        await client.connect();
        await ensureAgeReady(client, true); 
        await client.query('BEGIN READ ONLY');
        const result = await fetchUsecaseOrScenarioById(id, releasedOnly, client);
        await client.query('COMMIT');

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: result.status || 500 });
        }

        const mainId = cleanId(id);
        const main = result.allLoadedNodes!.get(mainId) || Array.from(result.allLoadedNodes!.values())[0];
        const allNodes = [main, ...Array.from(result.newSiblingNodes!.values()).filter(n => n.id !== main.id)];
        
        logger.info('USECASE', `Fetched usecase/scenario hierarchy for ${id}`, { nodeCount: allNodes.length });
        return NextResponse.json({ success: true, allLoadedNodes: allNodes });
    } catch (error: any) {
        if (client) await client.query('ROLLBACK');
        logger.error('USECASE', 'Internal error fetching hierarchy', { id, error: error.message });
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    } finally {
        await client.end();
    }
}
