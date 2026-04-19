import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import ServerLogger from '@/lib/server/logger';

const logger = new ServerLogger('FIREBASE_API');

export async function GET() {
    try {
        const envelopesCol = collection(db, 'envelopes');
        const q = query(envelopesCol, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const envelopes = snapshot.docs.map(doc => doc.data());

        return NextResponse.json({ 
            success: true, 
            items: envelopes.map(e => ({
                id: e.id,
                name: e.name,
                description: e.description,
                layoutType: e.layoutType,
                lastModified: e.updatedAt ? new Date(e.updatedAt).getTime() : Date.now(),
                source: 'firebase'
            }))
        });

    } catch (error: any) {
        logger.error('LIST', 'Failed to list envelopes from Firestore', { error: error.message });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
