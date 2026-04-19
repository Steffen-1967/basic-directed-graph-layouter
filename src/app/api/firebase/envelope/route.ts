import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { EnvelopeService } from '@/lib/server/envelopeService';
import { Envelope } from '@/manifest';
import ServerLogger from '@/lib/server/logger';

const logger = new ServerLogger('FIREBASE_API');

export async function POST(request: NextRequest) {
    try {
        const envelope: Envelope = await request.json();
        
        // 1. Validate
        const validation = EnvelopeService.validate(envelope);
        if (!validation.valid) {
            return NextResponse.json({ success: false, error: 'Validation failed', errors: validation.errors }, { status: 400 });
        }

        // 2. Flatten
        const envelopeId = envelope.id || 'envelope_' + Date.now();
        const { nodes, edges } = EnvelopeService.flatten(envelope, envelopeId);

        // 3. Batch Write to Firestore (Functional Syntax)
        const batch = writeBatch(db);

        // Metadata
        const envelopeRef = doc(db, 'envelopes', envelopeId);
        batch.set(envelopeRef, {
            id: envelopeId,
            name: envelope.name,
            description: envelope.description,
            layoutType: envelope.layoutType,
            layoutPreferences: envelope.layoutPreferences || {},
            root: envelope.root,
            updatedAt: new Date().toISOString()
        });

        // Nodes
        nodes.forEach(node => {
            const nodeRef = doc(db, 'nodes', node.id);
            batch.set(nodeRef, node);
        });

        // Edges
        edges.forEach(edge => {
            const edgeRef = doc(db, 'edges', edge.id);
            batch.set(edgeRef, edge);
        });

        await batch.commit();

        logger.info('SAVE', 'Envelope saved to Firestore', { envelopeId, nodeCount: nodes.length, edgeCount: edges.length });
        return NextResponse.json({ success: true, envelopeId });

    } catch (error: any) {
        logger.error('SAVE', 'Failed to save to Firestore', { error: error.message });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
