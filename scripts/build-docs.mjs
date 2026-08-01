#!/usr/bin/env node
// Build human-readable docs into public/docs/ (served at deckard.lol/docs)
// and generate public/llms-full.txt from the same pages.
//
// Sources: content/docs/*.md (curated) and/or repo docs/*.md (canonical deep refs).
// Run: node scripts/build-docs.mjs
// Wired into build:static / predev.

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  cpSync,
} from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { mdToHtml, stripFrontmatter } from "./lib/md.mjs"
import { pages } from "./lib/docs-pages.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "public", "docs")
const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://deckard.lol"

const sidebar = []
for (const p of pages) {
  let sec = sidebar.find((s) => s.label === p.section)
  if (!sec) {
    sec = { label: p.section, items: [] }
    sidebar.push(sec)
  }
  sec.items.push({
    title: p.title,
    href: p.slug === "" ? "/docs/" : `/docs/${p.slug}/`,
    slug: p.slug,
  })
}

function readPage(p) {
  if (p.content) {
    const raw = readFileSync(join(root, p.content), "utf8")
    const { data, body } = stripFrontmatter(raw)
    return {
      title: data.title || p.title,
      description: data.description || p.description,
      body,
    }
  }
  const raw = readFileSync(join(root, p.source), "utf8")
  // Drop leading H1 from source — page template supplies title
  let body = raw
  if (body.startsWith("# ")) {
    const nl = body.indexOf("\n")
    body = body.slice(nl + 1).replace(/^\n+/, "")
  }
  return { title: p.title, description: p.description, body }
}

function rewriteLinks(html) {
  // Map common in-repo markdown links to /docs/ routes
  const map = [
    [/href="(?:\.\.\/)?docs\/DECK_GRAMMAR\.md"/g, 'href="/docs/deck/grammar/"'],
    [/href="(?:\.\.\/)?docs\/DECK_AGENT_GRAMMAR\.md"/g, 'href="/docs/deck/agent-grammar/"'],
    [/href="(?:\.\.\/)?docs\/DECK_EXTENSION\.md"/g, 'href="/docs/deck/extensions/"'],
    [/href="(?:\.\.\/)?docs\/ARCHITECTURE\.md"/g, 'href="/docs/architecture/overview/"'],
    [/href="(?:\.\.\/)?docs\/GENERATORS\.md"/g, 'href="/docs/architecture/generators/"'],
    [/href="(?:\.\.\/)?docs\/WS_AND_AGENTS\.md"/g, 'href="/docs/agents/websocket/"'],
    [/href="(?:\.\.\/)?docs\/STREAM_PROTOCOL\.md"/g, 'href="/docs/agents/stream-protocol/"'],
    [/href="(?:\.\.\/)?docs\/DJ_SKILLS\.md"/g, 'href="/docs/agents/skills/"'],
    [/href="(?:\.\.\/)?docs\/AUTHOR_TAGGING\.md"/g, 'href="/docs/reference/author-tagging/"'],
    [/href="(?:\.\.\/)?docs\/TOKEN_STREAM_DEMO\.md"/g, 'href="/docs/reference/token-stream-demo/"'],
    [/href="(?:\.\.\/)?AGENTS\.md"/g, 'href="/docs/agents/overview/"'],
    [/href="(?:\.\.\/)?skills\/README\.md"/g, 'href="/docs/agents/roles/"'],
  ]
  let s = html
  for (const [re, rep] of map) s = s.replace(re, rep)
  return s
}

function layout({ title, description, slug, bodyHtml }) {
  const nav = sidebar
    .map((sec) => {
      const items = sec.items
        .map((it) => {
          const active = it.slug === slug ? ' class="active"' : ""
          return `<li><a href="${it.href}"${active}>${esc(it.title)}</a></li>`
        })
        .join("\n")
      return `<div class="nav-sec"><div class="nav-label">${esc(sec.label)}</div><ul>${items}</ul></div>`
    })
    .join("\n")

  const idx = pages.findIndex((p) => p.slug === slug)
  const prev = idx > 0 ? pages[idx - 1] : null
  const next = idx >= 0 && idx < pages.length - 1 ? pages[idx + 1] : null
  const prevHref = prev ? (prev.slug === "" ? "/docs/" : `/docs/${prev.slug}/`) : null
  const nextHref = next ? (next.slug === "" ? "/docs/" : `/docs/${next.slug}/`) : null

  const pageUrl = slug === "" ? `${SITE}/docs/` : `${SITE}/docs/${slug}/`
  // Pre-baked PNG (works on static hosts). Edge twin: /api/og?title=&description=
  const ogFile = slug === "" ? "index.png" : `${slug.replace(/\//g, "-")}.png`
  const ogImage = `${SITE}/og/${ogFile}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} · Deckard Docs</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(pageUrl)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Deckard" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(title)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta name="theme-color" content="#09090d" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/docs/docs.css" />
</head>
<body class="docs">
  <header class="docs-top">
    <a class="brand" href="/">Deckard</a>
    <nav>
      <a href="/docs/">Docs</a>
      <a href="/llms.txt">llms.txt</a>
      <a href="https://github.com/spacedevin/deckard" target="_blank" rel="noreferrer">GitHub</a>
      <a class="open-app" href="/">Open DAW</a>
    </nav>
  </header>
  <div class="docs-shell">
    <aside class="docs-nav">${nav}</aside>
    <main class="docs-main">
      <article class="prose">
        <h1>${esc(title)}</h1>
        <p class="lede">${esc(description)}</p>
        ${bodyHtml}
      </article>
      <nav class="docs-pager">
        ${prev ? `<a class="prev" href="${prevHref}">← ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? `<a class="next" href="${nextHref}">${esc(next.title)} →</a>` : "<span></span>"}
      </nav>
    </main>
  </div>
</body>
</html>
`
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ── build ──────────────────────────────────────────────────────────────────
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
cpSync(join(root, "content/docs/docs.css"), join(outDir, "docs.css"))

const fullParts = [
  `# Deckard — full documentation\n\n> Generated from deckard docs content. Site: ${SITE}\n`,
]

for (const p of pages) {
  const { title, description, body } = readPage(p)
  let htmlBody = rewriteLinks(mdToHtml(body))
  const html = layout({ title, description, slug: p.slug, bodyHtml: htmlBody })
  const dir = p.slug === "" ? outDir : join(outDir, p.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "index.html"), html, "utf8")
  fullParts.push(`\n---\n\n# ${title}\n\n${body.trim()}\n`)
  console.log(`docs: /docs/${p.slug === "" ? "" : p.slug + "/"}`)
}

writeFileSync(join(root, "public", "llms-full.txt"), fullParts.join(""), "utf8")
console.log("docs: wrote public/llms-full.txt")
console.log(`docs: ${pages.length} pages → ${outDir}`)
