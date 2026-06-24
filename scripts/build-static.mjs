// Assemble a self-contained static site into ./build for static hosting (e.g. DigitalOcean App Platform).
//
// In dev, Vite serves the repo root + public/ at the web root, so the app loads everything from absolute paths
// (/styles.css, /dist/bundle.js, /scope-worker.js, /clock-worklet.js, /scratch-worklet.js, /sync-worklet.js,
// /mespeak-worker.js, /mespeak/*). A static host serves ONE directory, so we collect exactly those runtime
// files (no node_modules, no src, no tests) into ./build with the same paths.
//
// Run AFTER `npm run build` (which compiles src/main.tish -> dist/bundle.js and the scope worker). The
// `build:static` npm script chains both.

import { cpSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'build')

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'dist'), { recursive: true })

function copy(from, to) {
  const src = join(root, from)
  if (!existsSync(src)) {
    console.error(`build-static: required file missing — ${from} (did \`npm run build\` run first?)`)
    process.exit(1)
  }
  cpSync(src, join(out, to), { recursive: true })
}

// Entry HTML + global stylesheet.
copy('index.html', 'index.html')
copy('styles.css', 'styles.css')

// The compiled app bundle (index.html loads it from `dist/bundle.js`).
copy('dist/bundle.js', 'dist/bundle.js')

// Workers + audio worklets the app loads from the web root ("/...").
copy('scope-worker.js', 'scope-worker.js')
copy('clock-worklet.js', 'clock-worklet.js')
copy('scratch-worklet.js', 'scratch-worklet.js')

// public/ assets are served at the web root in dev (Vite) — mirror that: mespeak/ (TTS engine + voices),
// mespeak-worker.js, sync-worklet.js. Copy each top-level entry so they land at /<name>, not /public/<name>.
const publicDir = join(root, 'public')
for (const entry of readdirSync(publicDir)) {
  cpSync(join(publicDir, entry), join(out, entry), { recursive: true })
}

console.log(`build-static: assembled static site → ${out}`)
console.log(`build-static: contents → ${readdirSync(out).sort().join(', ')}`)
