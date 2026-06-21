const fs = require('fs');
const bundle = fs.readFileSync('dist/bundle.js', 'utf8');
eval(bundle);
console.log("ACID303:", defaultParamsForGeneratorId("acid303"));
console.log("BASIC:", defaultParamsForGeneratorId("basicOsc"));
