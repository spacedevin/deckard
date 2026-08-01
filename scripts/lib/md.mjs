// Minimal CommonMark/GFM subset for Deckard docs — no npm deps.
// Supports: ATX headings, fenced code, tables, lists, blockquotes, paragraphs,
// links, images, bold/italic, inline code, hr.

export function mdToHtml(src) {
  const lines = String(src).replace(/\r\n/g, "\n").split("\n")
  const out = []
  let i = 0
  let inCode = false
  let codeLang = ""
  let codeBuf = []
  let para = []

  const flushPara = () => {
    if (!para.length) return
    const text = para.join("\n").trim()
    para = []
    if (!text) return
    out.push(`<p>${inline(text)}</p>`)
  }

  while (i < lines.length) {
    const line = lines[i]

    if (inCode) {
      if (line.startsWith("```")) {
        out.push(
          `<pre><code class="language-${esc(codeLang)}">${esc(codeBuf.join("\n"))}</code></pre>`,
        )
        inCode = false
        codeBuf = []
        codeLang = ""
      } else {
        codeBuf.push(line)
      }
      i++
      continue
    }

    if (line.startsWith("```")) {
      flushPara()
      inCode = true
      codeLang = line.slice(3).trim()
      i++
      continue
    }

    if (/^#{1,6}\s/.test(line)) {
      flushPara()
      const m = line.match(/^(#{1,6})\s+(.*)$/)
      const level = m[1].length
      const text = m[2].replace(/\s+#*$/, "")
      const id = slugify(text)
      out.push(`<h${level} id="${id}"><a class="anchor" href="#${id}"></a>${inline(text)}</h${level}>`)
      i++
      continue
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      flushPara()
      out.push("<hr />")
      i++
      continue
    }

    if (line.startsWith("> ")) {
      flushPara()
      const quote = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(lines[i].slice(2))
        i++
      }
      out.push(`<blockquote>${mdToHtml(quote.join("\n"))}</blockquote>`)
      continue
    }

    if (/^\|.+\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      flushPara()
      const rows = []
      while (i < lines.length && /^\|.+\|/.test(lines[i])) {
        rows.push(lines[i])
        i++
      }
      out.push(tableHtml(rows))
      continue
    }

    if (/^(\s*[-*]|\s*\d+\.)\s+/.test(line)) {
      flushPara()
      const ordered = /^\s*\d+\./.test(line)
      const items = []
      while (i < lines.length && /^(\s*[-*]|\s*\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^(\s*[-*]|\s*\d+\.)\s+/, ""))
        i++
      }
      const tag = ordered ? "ol" : "ul"
      out.push(
        `<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`,
      )
      continue
    }

    if (line.trim() === "") {
      flushPara()
      i++
      continue
    }

    para.push(line)
    i++
  }
  flushPara()
  if (inCode) {
    out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`)
  }
  return out.join("\n")
}

function tableHtml(rows) {
  if (rows.length < 2) return ""
  const split = (r) =>
    r
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim())
  const head = split(rows[0])
  // skip align row
  const body = rows.slice(2).map(split)
  let html = "<table><thead><tr>"
  for (const h of head) html += `<th>${inline(h)}</th>`
  html += "</tr></thead><tbody>"
  for (const row of body) {
    html += "<tr>"
    for (let c = 0; c < head.length; c++) html += `<td>${inline(row[c] ?? "")}</td>`
    html += "</tr>"
  }
  html += "</tbody></table>"
  return html
}

function inline(text) {
  let s = esc(text)
  // code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>")
  // links [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, url) => `<a href="${escAttr(url)}">${label}</a>`,
  )
  // bold ** **
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  // italic * *
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
  return s
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escAttr(s) {
  return esc(s).replace(/"/g, "&quot;")
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export function stripFrontmatter(src) {
  if (!src.startsWith("---\n")) return { data: {}, body: src }
  const end = src.indexOf("\n---\n", 4)
  if (end < 0) return { data: {}, body: src }
  const raw = src.slice(4, end)
  const body = src.slice(end + 5)
  const data = {}
  for (const line of raw.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    data[m[1]] = v
  }
  return { data, body }
}
