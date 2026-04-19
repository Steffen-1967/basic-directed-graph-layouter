import { NextRequest, NextResponse } from 'next/server';
import { Client, dbConfig, ensureAgeReady, executeCypher, GRAPH_NAME, PGClient } from '@/lib/server/db';
import { GraphTransformer } from '@/lib/server/graphTransformer';
import { NodeType } from '@/manifest';
import ServerLogger from '@/lib/server/logger';

const logger = new ServerLogger('AGE');

async function fetchNodesByType(type: string, client?: PGClient) {
    const query = `SELECT * FROM cypher('${GRAPH_NAME}', $$ MATCH (u) WHERE u.type = '${type}' RETURN u.id, u.type, u.name, u.description, u.versionable, u.version, u.versionContainer, u.locked, u.layoutType, u.layoutPreferences $$) as (id agtype, type agtype, name agtype, description agtype, versionable agtype, version agtype, versionContainer agtype, locked agtype, layoutType agtype, layoutPreferences agtype);`;
    const rows = await executeCypher(query, client);
    return rows.map(row => GraphTransformer.toDomainNode(row));
}

export async function GET() {
    const start = Date.now();
    console.log('[API-AGE] Fetching envelopes...');
    const client = new Client(dbConfig);
    try {
        await client.connect();
        await ensureAgeReady(client, true); 

        await client.query('BEGIN READ ONLY');
        const envelopesRaw = await fetchNodesByType(NodeType.Scenario, client);
        await client.query('COMMIT');
        
        const envelopeResult = GraphTransformer.toEnvelope(envelopesRaw);
        console.log(`[API-AGE] Envelopes fetch finished in ${Date.now() - start}ms. Count: ${envelopesRaw.length}`);
        return NextResponse.json({ success: true, envelopes: envelopeResult });
    } catch (error: any) {
        console.error('[API-AGE] Error fetching envelopes:', error);
        if (client) await client.query('ROLLBACK');
        logger.error('ENVELOPES', 'Failed to fetch envelopes', { error: error.message });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        await client.end();
    }
}

export async function POST(req: NextRequest) {
    const start = Date.now();
    const client = new Client(dbConfig);
    try {
        const envelope = await req.json();
        if (!envelope || !envelope.nodes) {
            return NextResponse.json({ success: false, error: 'Invalid envelope data' }, { status: 400 });
        }

        console.log(`[API-AGE] Saving envelope '${envelope.name?.[0]?.value}' to DB...`);
        
        await client.connect();
        await ensureAgeReady(client, true);
        await client.query('BEGIN');

        // Step 1: Clear existing graph data for this specific envelope
        // For now, we clear the entire graph to keep it simple during the migration phase
        // Later, we can scope this to specific 'Scenario' nodes and their subgraphs.
        await executeCypher(`SELECT * FROM cypher('${GRAPH_NAME}', $$ MATCH (n) DETACH DELETE n $$) as (a agtype);`, client);

        // Step 2: Create Nodes
        for (const node of envelope.nodes) {
            const pNode = GraphTransformer.toPersistenceNode(node);
            const propsStr = Object.entries(pNode.properties)
                .map(([k, v]) => `${k}: ${GraphTransformer.toCypherValue(v)}`)
                .join(', ');
            
            const query = `SELECT * FROM cypher('${GRAPH_NAME}', $$ CREATE (n:${pNode.label} {${propsStr}}) $$) as (a agtype);`;
            await executeCypher(query, client);
        }

        // Step 3: Create Edges (Relationships)
        for (const fromNode of envelope.nodes) {
            if (!fromNode.outgoing) continue;
            for (const edge of fromNode.outgoing) {
                const pEdge = GraphTransformer.toPersistenceEdge(fromNode.id, edge.id, edge);
                const propsStr = Object.entries(pEdge.properties)
                    .map(([k, v]) => `${k}: ${GraphTransformer.toCypherValue(v)}`)
                    .join(', ');
                
                const query = `SELECT * FROM cypher('${GRAPH_NAME}', $$ 
                    MATCH (a {id: '${pEdge.from}'}), (b {id: '${pEdge.to}'})
                    CREATE (a)-[r:${pEdge.label} {${propsStr}}]->(b)
                $$) as (a agtype);`;
                await executeCypher(query, client);
            }
        }

        await client.query('COMMIT');
        console.log(`[API-AGE] Envelope saved successfully in ${Date.now() - start}ms.`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API-AGE] Error saving envelope:', error);
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        await client.end();
    }
}
