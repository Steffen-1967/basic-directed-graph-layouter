import { NextRequest, NextResponse } from 'next/server';
import { releaseLock } from '@/lib/server/lockManager';

export async function POST(request: NextRequest) {
    const { envelope, clientId } = await request.json();
    releaseLock(envelope, clientId);
    return NextResponse.json({ success: true });
}
