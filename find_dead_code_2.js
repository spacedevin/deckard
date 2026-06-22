const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tish') || file.endsWith('.js') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(srcDir);

// Map of exportName -> file where it's exported
const exportsMap = new Map();

const regexExport = /export\s+(fn|let|const|class)\s+([a-zA-Z0-9_]+)/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = regexExport.exec(content)) !== null) {
    const name = match[2];
    exportsMap.set(name, file);
  }
});

console.log("=== COMPLETELY DEAD EXPORTS ===");
for (const [name, file] of exportsMap.entries()) {
  let usages = 0;
  const nameRegex = new RegExp(`\\b${name}\\b`, 'g');
  files.forEach(f => {
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    lines.forEach(line => {
      // ignore export declaration line
      if (line.match(new RegExp(`export\\s+(fn|let|const|class)\\s+${name}\\b`))) {
         // also count if it is used multiple times on the same line... wait, this is getting complicated.
         return;
      }
      const matches = line.match(nameRegex);
      if (matches) {
        usages += matches.length;
      }
    });
  });

  if (usages === 0) {
    console.log(`${name} in ${path.relative(srcDir, file)}`);
  }
}
