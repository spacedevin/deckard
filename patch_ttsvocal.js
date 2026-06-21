const fs = require('fs');
let file = fs.readFileSync('src/generators/TtsVocal.tish', 'utf8');
file = file.replace('let runTts = () => {', 'let runTts = () => {\n      console.log("runTts called! l=", l, "delay=", delaySec, "voiceIdx=", voiceIdx);');
file = file.replace('synth.speak(u)', 'console.log("speaking u with pitch", u.pitch, "rate", u.rate, "vol", u.volume, "text", u.text);\n      synth.speak(u)');
fs.writeFileSync('src/generators/TtsVocal.tish', file);
