#!/usr/bin/env node
// Bake static Open Graph PNGs for hosts without edge functions (e.g. DO static).
// Edge twin: GET /api/og?title=&description=  (api/og.tsx via @vercel/og)
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { renderOgPng } from "./lib/og-image.mjs"
import { pages } from "./lib/docs-pages.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = join(root, "public")
const ogDir = join(publicDir, "og")

const DEFAULT_DESC =
  "Token-streamed live-coding DAW — humans and agents co-DJ in deck."

mkdirSync(ogDir, { recursive: true })

const home = await renderOgPng({
  title: "Deckard",
  description: DEFAULT_DESC,
  eyebrow: "deckard.lol",
})
writeFileSync(join(publicDir, "og.png"), home)
console.log(`og: og.png (${home.length} bytes)`)

for (const p of pages) {
  const file = p.slug === "" ? "index.png" : `${p.slug.replace(/\//g, "-")}.png`
  const buf = await renderOgPng({
    title: p.title,
    description: p.description,
    eyebrow: "docs",
  })
  writeFileSync(join(ogDir, file), buf)
  console.log(`og: og/${file} (${buf.length} bytes)`)
}

if (existsSync(join(ogDir, "index.png"))) {
  writeFileSync(join(publicDir, "og-docs.png"), readFileSync(join(ogDir, "index.png")))
  console.log("og: og-docs.png (alias of og/index.png)")
}
