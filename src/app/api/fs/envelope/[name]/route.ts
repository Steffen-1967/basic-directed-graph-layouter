import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import ServerLogger from '@/lib/server/logger';

const dataDir = path.join(process.cwd(), 'data');
const logger = new ServerLogger('FS');

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    const start = Date.now();
    try {
        const fileName = (await params).name;
        const filePath = path.join(dataDir, fileName);
        console.log(`[API-FS] Reading envelope ${fileName}...`);
        
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'Envelope not found' }, { status: 404 });
        }

        const data = fs.readFileSync(filePath, 'utf8');
        console.log(`[API-FS] Read finished in ${Date.now() - start}ms.`);
        return NextResponse.json({ success: true, data: JSON.parse(data) });
    } catch (error: any) {
        logger.error('READ', 'Failed to read envelope file', { fileName: (await params).name, error: error.message });
        return NextResponse.json({ success: false, error: 'Failed to read envelope file' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const fileName = (await params).name;
        const filePath = path.join(dataDir, fileName);
        const content = await request.json();
        
        // Ensure data directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
        
        // Extract basic stats for logging
        const nodeCount = content.nodes ? content.nodes.length : 0;
        logger.info('SAVE', 'Envelope saved', { fileName, nodeCount });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        logger.error('SAVE', 'Failed to save envelope file', { fileName: (await params).name, error: error.message });
        return NextResponse.json({ success: false, error: 'Failed to save envelope' }, { status: 500 });
    }
}
