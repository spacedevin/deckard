// Compiles src/main.tish -> dist/bundle.js via `tish build --target js`, and full-reloads the
// browser whenever a .tish (or styles.css) file changes.
//
// Why full-reload (not HMR): Lattish re-mounts the whole tree on every render (see docs/LATTISH.md),
// and the compiled bundle is a single self-contained classic script — there is no module-level state
// to hot-swap, so a fresh page is both correct and the only thing needed. (Same call the tish+Vite
// app in ~/Projects/schlop/spider3-tish makes; this is adapted from its plugin to the --target js
// output tish-midi uses. There is no published tish Vite plugin — this ~40-line shim is the pattern.)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const ENTRY = path.join(ROOT, 'src/main.tish')
const OUT = path.join(ROOT, 'dist/bundle.js')

// Prefer an explicit $TISH, then the npm-installed binary, then a cargo install, then PATH.
function resolveTish() {
  if (process.env.TISH) return process.env.TISH
  const local = path.join(ROOT, 'node_modules/.bin/tish')
  if (existsSync(local)) return local
  const cargo = path.join(process.env.HOME || '', '.cargo/bin/tish')
  if (existsSync(cargo)) return cargo
  return 'tish'
}

function compile() {
  mkdirSync(path.dirname(OUT), { recursive: true })
  execFileSync(resolveTish(), ['build', '--target', 'js', ENTRY, '-o', OUT], { stdio: 'inherit' })
}

export default function tishPlugin() {
  return {
    name: 'vite-plugin-tish',
    enforce: 'pre',

    // Build the bundle once before the first request (dev) and before `vite build`.
    buildStart() {
      compile()
    },

    configureServer(server) {
      server.watcher.add(path.join(ROOT, 'src/**/*.tish'))
      // Serve the freshly compiled bundle straight from disk — it's self-contained JS that needs
      // no transform, and this bypasses Vite's transform cache (which doesn't invalidate on recompile
      // since dist/ isn't a watched source), so a save always reaches the browser.
      const raw = [
        { url: '/dist/bundle.js', file: OUT, type: 'application/javascript; charset=utf-8' },
        { url: '/styles.css', file: path.join(ROOT, 'styles.css'), type: 'text/css; charset=utf-8' },
      ]
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        const hit = raw.find((r) => r.url === url)
        if (hit) {
          try {
            const body = readFileSync(hit.file, 'utf8')
            res.setHeader('Content-Type', hit.type)
            res.setHeader('Cache-Control', 'no-store')
            res.end(body)
            return
          } catch (e) {
            // fall through to Vite if the file isn't there yet
          }
        }
        next()
      })
    },

    handleHotUpdate(ctx) {
      const f = ctx.file
      if (f.endsWith('.tish')) {
        try {
          compile()
        } catch (e) {
          // Keep the dev server alive on a compile error — tish already printed it to stderr.
          server_log_noop(e)
        }
        ctx.server.ws.send({ type: 'full-reload' })
        return [] // handled — suppress Vite's default HMR for .tish
      }
      if (f.endsWith('styles.css')) {
        ctx.server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

function server_log_noop(_e) {}
