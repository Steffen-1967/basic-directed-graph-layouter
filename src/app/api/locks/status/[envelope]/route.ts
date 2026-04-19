import { NextRequest, NextResponse } from 'next/server';
import { getLockStatus } from '@/lib/server/lockManager';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ envelope: string }> }
) {
    const envelope = (await params).envelope;
    const status = getLockStatus(decodeURIComponent(envelope));
    return NextResponse.json(status);
}

