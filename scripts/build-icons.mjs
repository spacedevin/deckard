#!/usr/bin/env node
// Render the app icons from the two SVG masters:
//   public/icon.svg     → icon-512.png, icon-192.png, apple-touch-icon.png (full-bleed tile)
//   public/favicon.svg  → favicon.ico (16, 32, 48; the simplified small-size mark)
// resvg comes in with @vercel/og, so no extra dependency.
import { readFileSync, writeFileSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = join(root, "public")

const fromRoot = createRequire(join(root, "package.json"))
const fromOg = createRequire(realpathSync(fromRoot.resolve("@vercel/og")))
const resvgEntry = fromOg.resolve("@resvg/resvg-wasm")
const resvg = await import(resvgEntry)
const { initWasm, Resvg } = resvg.initWasm ? resvg : resvg.default
await initWasm(readFileSync(join(dirname(resvgEntry), "index_bg.wasm")))

function render(svg, size) {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: size }, background: "rgba(0,0,0,0)" })
  return Buffer.from(r.render().asPng())
}

// An .ico whose entries are PNGs (supported by every current browser and OS).
function ico(pngs) {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(pngs.length, 4)
  const dir = Buffer.alloc(16 * pngs.length)
  let offset = 6 + dir.length
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt8(0, o + 2)
    dir.writeUInt8(0, o + 3)
    dir.writeUInt16LE(1, o + 4)
    dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(data.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += data.length
  })
  return Buffer.concat([head, dir, ...pngs.map((p) => p.data)])
}

const master = readFileSync(join(publicDir, "icon.svg"), "utf8")
const small = readFileSync(join(publicDir, "favicon.svg"), "utf8")

for (const [name, size] of [["icon-512.png", 512], ["icon-192.png", 192], ["apple-touch-icon.png", 180]]) {
  const png = render(master, size)
  writeFileSync(join(publicDir, name), png)
  console.log(`icons: ${name} (${png.length} bytes)`)
}
const favicon = ico([16, 32, 48].map((size) => ({ size, data: render(small, size) })))
writeFileSync(join(publicDir, "favicon.ico"), favicon)
console.log(`icons: favicon.ico (${favicon.length} bytes)`)
