import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import forceAtlas2 from 'graphology-layout-forceatlas2';
import Graph from 'graphology';
import { RENDER_CONFIG } from '@/manifest';
import ServerLogger from '@/lib/server/logger';

const logger = new ServerLogger('LAYOUT');

export async function POST(request: NextRequest) {
    logger.info('FORCE-ATLAS', 'POST request received');
    try {
        const body = await request.json();
        const { nodes, edges, config, iterations = 100 } = body;
        
        if (!nodes || !Array.isArray(nodes)) {
            return NextResponse.json({ success: false, error: 'Nodes array required' }, { status: 400 });
        }

        const graph = new Graph();
        
        // 1. Add nodes with their current (possibly random) positions
        nodes.forEach((node: any) => {
            graph.addNode(node.id, {
                x: node.x ?? Math.random() * 100,
                y: node.y ?? Math.random() * 100,
                size: 10
            });
        });

        if (nodes.length > 0) {
            const first = nodes[0];
            const graphNode = graph.getNodeAttributes(first.id);
            // logger.info('FORCE-ATLAS', `Start coordinates for node ${first.id}: x=${graphNode.x}, y=${graphNode.y}`);
        }

        // 2. Add edges
        if (edges && Array.isArray(edges)) {
            edges.forEach((edge: any) => {
                if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
                    if (!graph.hasEdge(edge.source, edge.target)) {
                        graph.addEdge(edge.source, edge.target, { weight: edge.weight ?? 1 });
                    }
                }
            });
        }

        const nodeCount = nodes.length;
        let gravity = config?.gravity ?? RENDER_CONFIG.layout.forceAtlas2.gravity ?? 1.0;
        let scalingRatio = config?.scalingRatio ?? RENDER_CONFIG.layout.forceAtlas2.scalingRatio ?? 1.0;

        // Restore dynamic scaling factors for larger node counts
        if (nodeCount > 25 && nodeCount <= 50) {
            gravity *= 0.5; scalingRatio *= 6.0;
        } else if (nodeCount > 50 && nodeCount <= 75) {
            gravity *= 0.3; scalingRatio *= 12.0;
        } else if (nodeCount > 75) {
            gravity *= 0.1; scalingRatio *= 24.0;
        }

        const layoutSettings = {
            gravity: gravity,
            scalingRatio: scalingRatio,
            edgeWeightInfluence: config?.edgeWeightInfluence ?? RENDER_CONFIG.layout.forceAtlas2.edgeWeightInfluence ?? 1.0,
            strongGravityMode: false,
            outboundAttractionDistribution: true,
            linLogMode: true,
            barnesHutOptimize: nodeCount > 50,
            adjustSizes: true
        };

        // Run the simulation
        forceAtlas2.assign(graph, {
            iterations: iterations,
            settings: layoutSettings
        });

        // Extract results
        const resultPositions = graph.nodes().map(id => ({
            id,
            x: graph.getNodeAttribute(id, 'x'),
            y: graph.getNodeAttribute(id, 'y')
        }));

        if (resultPositions.length > 0) {
            const first = resultPositions[0];
            // logger.info('FORCE-ATLAS', `Final coordinates for node ${first.id}: x=${first.x}, y=${first.y}`);
        }

        return NextResponse.json({ 
            success: true, 
            positions: resultPositions 
        });
    } catch (error: any) {
        logger.error('FORCE-ATLAS', 'Force Atlas calculation failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
