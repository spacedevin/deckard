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

// Map of exportName -> count of usages
const usageCount = new Map();

const regexExport = /export\s+(fn|let|const|class)\s+([a-zA-Z0-9_]+)/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = regexExport.exec(content)) !== null) {
    const name = match[2];
    exportsMap.set(name, file);
    usageCount.set(name, 0);
  }
});

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  for (const name of exportsMap.keys()) {
    // Escape name for regex
    const nameRegex = new RegExp(`\\b${name}\\b`, 'g');
    const matches = content.match(nameRegex);
    if (matches) {
      // If it's used in the same file, we need to subtract the export declaration itself
      // Actually, a simpler way is just to count occurrences. 
      // If it's > 1, it's used. Wait, what if it's imported in another file?
      // Let's just check if it's imported: `import { ... name ... }`
      const importRegex = new RegExp(`import\\s+.*\\b${name}\\b`, 'g');
      if (importRegex.test(content)) {
        usageCount.set(name, usageCount.get(name) + 1);
      }
    }
  }
});

console.log("=== DEAD EXPORTS (Never Imported) ===");
for (const [name, count] of usageCount.entries()) {
  if (count === 0) {
    // Some things like renderApp might not be imported but used as entry points.
    console.log(`${name} in ${path.relative(srcDir, exportsMap.get(name))}`);
  }
}
