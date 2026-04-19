import { NextRequest, NextResponse } from 'next/server';
import { Client, dbConfig, ensureAgeReady, executeCypher, GRAPH_NAME, PGClient } from '@/lib/server/db';
import { GraphTransformer } from '@/lib/server/graphTransformer';
import { NodeType } from '@/manifest';
import ServerLogger from '@/lib/server/logger';

const logger = new ServerLogger('AGE');

async function fetchNodesByType(type: string, client?: PGClient) {
    const query = `SELECT * FROM cypher('${GRAPH_NAME}', $$ MATCH (u) WHERE u.type = '${type}' RETURN u.id, u.type, u.name, u.description, u.versionable, u.version, u.versionContainer, u.locked $$) as (id agtype, type agtype, name agtype, description agtype, versionable agtype, version agtype, versionContainer agtype, locked agtype);`;
    const rows = await executeCypher(query, client);
    return rows.map(row => GraphTransformer.toDomainNode(row));
}

export async function GET() {
    const start = Date.now();
    console.log('[API-AGE] Fetching usecases...');
    const client = new Client(dbConfig);
    try {
        await client.connect();
        await ensureAgeReady(client, true); 

        await client.query('BEGIN READ ONLY');
        const usecases = await fetchNodesByType(NodeType.UseCase, client);
        await client.query('COMMIT');
        
        const envelope = GraphTransformer.toEnvelope(usecases);
        console.log(`[API-AGE] Usecases fetch finished in ${Date.now() - start}ms. Count: ${usecases.length}`);
        return NextResponse.json({ success: true, usecases: envelope });
    } catch (error: any) {
        console.error('[API-AGE] Primary error during usecases fetch:', error); // Log the full error object

        let rollbackError: any = null;
        if (client) {
            try {
                await client.query('ROLLBACK');
                console.log('[API-AGE] ROLLBACK successful.');
            } catch (rbError: any) {
                console.error('[API-AGE] Error during ROLLBACK:', rbError); // Log error during rollback
                rollbackError = rbError;
            }
        }

        const errorMessage = `Failed to fetch usecases: ${error.message || 'Unknown error'}. ${rollbackError ? `Rollback failed: ${rollbackError.message}.` : ''}`;
        logger.error('USECASES', errorMessage, { error, rollbackError });
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    } finally {
        if (client) {
            try {
                await client.end();
                console.log('[API-AGE] Client connection ended.');
            } catch (clientEndErr: any) {
                console.error('[API-AGE] Error during client.end():', clientEndErr); // Log error during client.end()
                logger.error('USECASES', 'Error ending client connection.', { clientEndError: clientEndErr });
            }
        }
    }}
