import { defineConfig } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import tish from './vite-plugin-tish.js'

// tish-midi is a static `--target js` Lattish app: index.html loads dist/bundle.js + styles.css.
// The tish plugin compiles src/main.tish -> dist/bundle.js and full-reloads on .tish / CSS change.
// Vite serves index.html (root) and the compiled bundle as a static asset — no module-graph magic.
//
// appType 'mpa' disables SPA fallback (which otherwise serves the DAW index.html for /docs/).
export default defineConfig({
  plugins: [
    tish(),
    {
      name: 'docs-dir-index',
      configureServer(server) {
        // Serve public/docs/**/index.html for /docs and /docs/<path>/ before SPA fallback.
        server.middlewares.use((req, res, next) => {
          const raw = (req.url || '').split('?')[0]
          if (!raw.startsWith('/docs')) return next()
          let rel = raw === '/docs' || raw === '/docs/' ? 'docs/index.html' : raw.replace(/^\//, '')
          if (rel.endsWith('/')) rel += 'index.html'
          else if (!/\.[a-zA-Z0-9]+$/.test(rel)) rel += '/index.html'
          if (!rel.endsWith('.html')) return next() // css/assets: let Vite's public dir handler serve them
          const file = join(server.config.root, 'public', rel)
          if (!existsSync(file)) return next()
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(readFileSync(file))
        })
      },
    },
  ],
  appType: 'mpa',
  // dist/bundle.js is a generated classic script served outside Vite's module graph; disable dev
  // caching so a recompile is always picked up on reload (no stale 304s).
  server: { open: false, headers: { 'Cache-Control': 'no-store' } },
})
