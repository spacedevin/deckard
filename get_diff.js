const fs = require('fs');
const cp = require('child_process');
try {
  console.log(cp.execSync('git diff origin/main src/generators/TtsVocal.tish').toString());
} catch(e) {
  console.log('Error:', e.message);
}
