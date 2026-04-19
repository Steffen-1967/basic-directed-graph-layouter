import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { LayoutType } from '@/manifest';
import { LayoutEngine } from '@/layoutEngine';
import ServerLogger from '@/lib/server/logger';

const dataDir = path.join(process.cwd(), 'data');
const logger = new ServerLogger('FS');

export async function GET() {
    const start = Date.now();
    console.log('[API-FS] Listing data files...');
    try {
        if (!fs.existsSync(dataDir)) {
            return NextResponse.json({ success: true, rawList: [] });
        }

        const files = fs.readdirSync(dataDir);
        const dataFiles = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(dataDir, file);
                
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const rawData = JSON.parse(fileContent);
                    const envelope = LayoutEngine.validateAndTransformGraph(rawData);
                    
                    const stats = fs.statSync(filePath);
                    const mtimeMs = stats.mtimeMs;
                    const size = stats.size;

                    // Extract name from envelope
                    let displayName = file.replace('.json', '');
                    if (envelope.name && envelope.name.length > 0) {
                        const deName = envelope.name.find(n => n.lcid === 1031);
                        if (deName) displayName = deName.value;
                        else displayName = envelope.name[0].value;
                    }

                    // Extract root node type and version
                    let rootNodeType = 'Scenario';
                    let version: string | null = '';
                    if (envelope.root) {
                        const rootNode = envelope.nodes.find(n => n.id === envelope.root);
                        if (rootNode) {
                            rootNodeType = rootNode.type;
                            version = rootNode.version || null;
                        }
                    } else if (envelope.nodes.length > 0) {
                        rootNodeType = envelope.nodes[0].type;
                        version = envelope.nodes[0].version || null;
                    }

                    return {
                        fileName: file,
                        lastModified: mtimeMs,
                        size: size,
                        type: rootNodeType,
                        version: version,
                        layoutType: envelope.layoutType,
                        name: envelope.name,
                        description: envelope.description
                    };
                } catch (e) { 
                    console.error(`[API-FS] Error processing ${file}:`, e);
                    const stats = fs.statSync(filePath);
                    return {
                        fileName: file,
                        lastModified: stats.mtimeMs,
                        size: stats.size,
                        type: 'Error',
                        layoutType: LayoutType.Flow,
                        name: [{ lcid: 1031, value: file.replace('.json', '') }],
                        description: []
                    };
                }
            });
        
        console.log(`[API-FS] Finished listing in ${Date.now() - start}ms. Count: ${dataFiles.length}`);
        return NextResponse.json({ success: true, rawList: dataFiles });
    } catch (error: any) {
        logger.error('LIST', 'Failed to list data files', { error: error.message });
        return NextResponse.json({ success: false, error: 'Failed to list data files' }, { status: 500 });
    }
}
