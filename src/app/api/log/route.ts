import { NextRequest, NextResponse } from 'next/server';
import ServerLogger from '@/lib/server/logger';

export async function POST(request: NextRequest) {
    try {
        const { level, category, message, details } = await request.json();
        
        // FORCE 'CLIENT' category to ensure cli_ prefix in filename
        const clientLogger = new ServerLogger('CLIENT');
        
        const cat = category || 'GENERAL';
        const logMsg = `[CLIENT-PROXY] [${level.toUpperCase()}] [${cat}] ${message}`;
        console.log(logMsg);
        if (details) console.log('  Details:', details);

        switch (level) {
            case 'error': clientLogger.error(cat, message, details); break;
            case 'warn':  clientLogger.warn(cat, message, details); break;
            default:      clientLogger.info(cat, message, details);
        }
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to proxy log:', error);
        return NextResponse.json({ success: false, error: 'Failed to proxy log' }, { status: 500 });
    }
}
