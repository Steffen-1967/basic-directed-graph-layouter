import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { EnvelopeService } from '@/lib/server/envelopeService';
import ServerLogger from '@/lib/server/logger';

const logger = new ServerLogger('FIREBASE_API');

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const envelopeId = (await params).id;
    try {
        // 1. Fetch Metadata
        const envelopeRef = doc(db, 'envelopes', envelopeId);
        const envelopeDoc = await getDoc(envelopeRef);
        
        if (!envelopeDoc.exists()) {
            return NextResponse.json({ success: false, error: 'Envelope not found' }, { status: 404 });
        }
        const envelopeMeta = envelopeDoc.data();

        // 2. Fetch Nodes
        const nodesCol = collection(db, 'nodes');
        const nodesQuery = query(nodesCol, where('envelopeId', '==', envelopeId));
        const nodesSnapshot = await getDocs(nodesQuery);
        const flatNodes = nodesSnapshot.docs.map(doc => doc.data());

        // 3. Fetch Edges
        const edgesCol = collection(db, 'edges');
        const edgesQuery = query(edgesCol, where('envelopeId', '==', envelopeId));
        const edgesSnapshot = await getDocs(edgesQuery);
        const flatEdges = edgesSnapshot.docs.map(doc => doc.data());

        // 4. Reconstruct
        const envelope = EnvelopeService.reconstruct(envelopeMeta, flatNodes, flatEdges);

        return NextResponse.json({ success: true, data: envelope });

    } catch (error: any) {
        logger.error('READ', 'Failed to read from Firestore', { envelopeId, error: error.message });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
