import { NextRequest, NextResponse } from 'next/server';
import { acquireLock } from '@/lib/server/lockManager';

export async function POST(request: NextRequest) {
    const { envelope, clientId } = await request.json();
    if (!envelope || !clientId) {
        return NextResponse.json({ success: false, message: 'Missing envelope or clientId' }, { status: 400 });
    }
    const result = acquireLock(envelope, clientId);
    return NextResponse.json(result);
}

