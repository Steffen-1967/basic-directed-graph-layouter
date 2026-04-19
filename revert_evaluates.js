import * as fs from 'fs';
import * as path from 'path';

const dataDir = './data';

function processFile(filePath) {
    console.log(`Reverting 'evaluates' in ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const envelope = JSON.parse(content);

    function cleanEdges(nodes) {
        if (!nodes) return;
        nodes.forEach(node => {
            if (node.incoming) {
                node.incoming.forEach(edge => {
                    if (edge.type === 'evaluates') {
                        // Reverting to 'output' or removing it is tricky without history.
                        // However, based on the previous logic, these were typically output/input relations.
                        // If we set it to 'output', it's a safe default for Task <-> Event/Rule in this app.
                        edge.type = 'output'; 
                    }
                });
            }
            if (node.outgoing) {
                node.outgoing.forEach(edge => {
                    if (edge.type === 'evaluates') {
                        edge.type = 'output';
                    }
                });
            }
            if (node.nodes) cleanEdges(node.nodes);
        });
    }

    cleanEdges(envelope.nodes);
    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), 'utf8');
}

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
files.forEach(file => {
    processFile(path.join(dataDir, file));
});

console.log("Revert complete.");
