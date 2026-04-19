/**
 * @file db.ts
 * @description Database utility for PostgreSQL with Apache AGE in Next.js.
 * Provides connection management and AGE environment setup.
 */

import pg from 'pg';
import type { Client as PG_Client } from 'pg';
// @ts-ignore
import * as age from 'pg-age';
import ServerLogger from './logger';

const { Client } = pg;
export type PGClient = PG_Client;
const logger = new ServerLogger('DB');

export const dbConfig = {
    host: 'localhost',
    user: 'postgres',
    password: 'pass',
    database: 'postgres',
    port: 5432,
};

export const GRAPH_NAME = 'mylife_graph';

/**
 * Robustly cleans an ID from potential AGE quotes and ensures string type.
 * @param id - The raw ID from the database.
 * @returns {string} The cleaned ID string.
 */
export function cleanId(id: any): string {
    if (id === null || id === undefined) return '';
    return String(id).replace(/"/g, '');
}

/**
 * Prepares the environment for Apache AGE.
 * 
 * @param client - The active PostgreSQL client.
 * @param ensureGraph - If true, checks if the graph exists and creates it if missing.
 */
export async function ensureAgeReady(client: pg.Client, ensureGraph: boolean = false) {
    await age.setAGETypes(client, pg.types);
    await client.query("LOAD 'age'");
    await client.query("SET search_path = ag_catalog, '$user', public");

    if (ensureGraph) {
        try {
            // Idempotent graph creation
            await client.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM ag_catalog.ag_graph WHERE name = '${GRAPH_NAME}') THEN
                        PERFORM create_graph('${GRAPH_NAME}'); 
                    END IF; 
                END $$;
            `);
        } catch (e) {
            logger.warn('AGE', `Graph check/creation skipped or failed for '${GRAPH_NAME}'.`);
        }
    }
}

/**
 * Helper to execute a Cypher query.
 * Automatically handles connection management and AGE setup if no existing client is provided.
 * 
 * @param query - The Cypher query string.
 * @param existingClient - Optional: Reuses an existing connection.
 */
export async function executeCypher(query: string, existingClient?: pg.Client) {
    const client = existingClient || new Client(dbConfig);
    if (!existingClient) {
        await client.connect();
        await ensureAgeReady(client, true); 
    }

    try {
        const res = await client.query(query);
        return res.rows;
    } finally {
        if (!existingClient) await client.end();
    }
}

export { Client };
