const fs = require('fs');

let code = fs.readFileSync('dist/bundle.js', 'utf8');
code = code.replace(/export /g, ''); // strip exports if any

// Run the bundle in a new function context to extract the functions we need
const bundleModule = {};
const script = `
  const exports = {};
  ${code}
  return {
    compileGeneratorToPatchLines,
    parsePatchGraph
  };
`;
const extracted = new Function(script)();

const p = { morphRate: 0.5, morphAmt: 0.6, width: 0.6, vibRate: 0.5, vibAmt: 0.4, highpass: 300, attack: 0.4, release: 0.6, shift: 12 };
const lines = extracted.compileGeneratorToPatchLines("syncChoir", p, {});
console.log("Lines generated:", lines.length);
console.log(lines);

const graph = extracted.parsePatchGraph(lines);
console.log("Graph nodes length:", graph.nodes.length);
