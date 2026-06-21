const fs = require('fs');
const content = fs.readFileSync('src/generators/TtsVocal.tish', 'utf8');
console.log(content.match(/if \(synth.speaking\) \{\s*synth.cancel\(\)\s*\}/g));
