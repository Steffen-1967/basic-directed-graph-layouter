import { NextRequest, NextResponse } from 'next/server';
import { heartbeatLock } from '@/lib/server/lockManager';

export async function POST(request: NextRequest) {
    const { envelope, clientId } = await request.json();
    const result = heartbeatLock(envelope, clientId);
    if (result.success) {
        return NextResponse.json(result);
    } else {
        return NextResponse.json({ success: false, error: 'Lock lost or not owned' }, { status: 403 });
    }
}
