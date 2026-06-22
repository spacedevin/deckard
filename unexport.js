const fs = require('fs');
const path = require('path');

const dead = [
  "stepsToScheduleInWindow", "underrunsInBatch", "transportPlayDirective",
  "transportPreviewDirective", "throwDirective", "coDjMaxLookaheadPerfSteps",
  "skillAllowsLine", "actorHasSkill", "levelList", "autoParamSpec",
  "setStepVel", "setGeneratorAdsr", "quantizeNoteToStep", "removeLevelPreset",
  "canCompileToPatch", "rackBars", "copySteps16FromChannel",
  "sessionArmTrackClip", "sessionQueueTrackClip", "addPatchConn", "tplLineStreamReset"
];

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

const allFiles = getAllFiles(srcDir);

allFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  let changed = false;
  dead.forEach(name => {
    const reg = new RegExp(`export\\s+(fn|let|const|class)\\s+${name}\\b`, 'g');
    if (content.match(reg)) {
      content = content.replace(reg, `$1 ${name}`);
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(f, content);
    console.log(`Cleaned up exports in ${path.relative(srcDir, f)}`);
  }
});
