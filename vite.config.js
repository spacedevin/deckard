import { defineConfig } from 'vite'
import tish from './vite-plugin-tish.js'

// tish-midi is a static `--target js` Lattish app: index.html loads dist/bundle.js + styles.css.
// The tish plugin compiles src/main.tish -> dist/bundle.js and full-reloads on .tish / CSS change.
// Vite serves index.html (root) and the compiled bundle as a static asset — no module-graph magic.
export default defineConfig({
  plugins: [tish()],
  server: { open: false },
})
