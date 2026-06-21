const cp = require('child_process');
try {
  console.log(cp.execSync('git diff HEAD~5 src/ui/App.tish').toString());
} catch(e) {
  console.log('Error:', e.message);
}
