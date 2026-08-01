// Shared Deckard OG card (1200×630) for build-time PNGs.
// Edge runtime twin: api/og.tsx (Vercel @vercel/og pattern).
import { createElement as h } from "react"
import { ImageResponse } from "@vercel/og"
import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")

const W = 1200
const H = 630
const BG = "#050507"
const PANEL = "#09090d"
const BORDER = "#14141c"
const TEXT = "#cccccc"
const MUTED = "#55555e"
const MINT = "#7cff7c"
const WARM = "#e8945c"

function clamp(s, max) {
  const t = String(s ?? "").trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + "…"
}

function fader(top, knobs) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "absolute",
        top,
        left: 86,
      },
    },
    knobs.map((x, i) =>
      h(
        "div",
        {
          key: i,
          style: {
            display: "flex",
            alignItems: "center",
            position: "relative",
            width: 118,
            height: 14,
          },
        },
        h("div", {
          style: {
            position: "absolute",
            left: 0,
            right: 0,
            height: 3,
            background: MINT,
            opacity: 0.85,
          },
        }),
        h("div", {
          style: {
            position: "absolute",
            left: x,
            width: 16,
            height: 14,
            background: MINT,
            borderRadius: 2,
          },
        }),
      ),
    ),
  )
}

function mark() {
  return h(
    "div",
    {
      style: {
        display: "flex",
        width: 280,
        height: 280,
        background: PANEL,
        border: `2px solid ${BORDER}`,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      },
    },
    h("div", {
      style: {
        display: "flex",
        position: "absolute",
        left: 48,
        top: 36,
        width: 52,
        height: 208,
        background: WARM,
        borderRadius: 4,
      },
    }),
    h("div", {
      style: {
        display: "flex",
        position: "absolute",
        left: 100,
        top: 36,
        width: 132,
        height: 208,
        border: `52px solid ${WARM}`,
        borderLeft: "none",
        borderRadius: "0 999px 999px 0",
      },
    }),
    h("div", {
      style: {
        display: "flex",
        position: "absolute",
        left: 100,
        top: 88,
        width: 80,
        height: 104,
        background: PANEL,
        borderRadius: "0 999px 999px 0",
      },
    }),
    fader(108, [8, 72, 40]),
  )
}

export function ogCard({ title, description, eyebrow }) {
  const t = clamp(title || "Deckard", 48)
  const d = clamp(
    description || "Token-streamed live-coding DAW — humans and agents co-DJ in deck.",
    140,
  )
  const eye = clamp(eyebrow || "deckard.lol", 40)

  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        background: BG,
        color: TEXT,
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        position: "relative",
        overflow: "hidden",
      },
    },
    h("div", {
      style: {
        position: "absolute",
        right: -120,
        top: -160,
        width: 520,
        height: 520,
        borderRadius: 999,
        background: "rgba(124, 255, 124, 0.08)",
        display: "flex",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: -160,
        bottom: -200,
        width: 560,
        height: 560,
        borderRadius: 999,
        background: "rgba(232, 148, 92, 0.07)",
        display: "flex",
      },
    }),
    h(
      "div",
      {
        style: {
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 48,
          display: "flex",
          gap: 10,
        },
      },
      Array.from({ length: 32 }).map((_, i) =>
        h("div", {
          key: i,
          style: {
            width: 18,
            height: 18,
            borderRadius: 3,
            background: i % 4 === 0 ? MINT : BORDER,
            opacity: i % 4 === 0 ? 0.55 : 0.9,
            display: "flex",
          },
        }),
      ),
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 80px 96px",
          gap: 56,
        },
      },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", flex: 1, maxWidth: 680 } },
        h(
          "div",
          {
            style: {
              display: "flex",
              color: MINT,
              fontSize: 22,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 28,
            },
          },
          eye,
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              color: WARM,
              fontSize: t.length > 28 ? 64 : 84,
              fontWeight: 700,
              letterSpacing: "0.04em",
              lineHeight: 1.05,
              marginBottom: 28,
            },
          },
          t,
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              color: MUTED,
              fontSize: 28,
              lineHeight: 1.35,
              maxWidth: 640,
            },
          },
          d,
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              marginTop: 36,
              color: MUTED,
              fontSize: 20,
              letterSpacing: "0.02em",
            },
          },
          "by space.la",
        ),
      ),
      mark(),
    ),
  )
}

async function loadFont() {
  // Prefer a local TTF if present; else pull JetBrains Mono Bold from GitHub (ttf).
  const local = join(root, "assets/fonts/JetBrainsMono-Bold.ttf")
  if (existsSync(local)) return readFileSync(local)
  try {
    const url =
      "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Bold.ttf"
    const res = await fetch(url)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

/** @returns {Promise<Buffer>} */
export async function renderOgPng(opts = {}) {
  const font = await loadFont()
  const fonts = font
    ? [{ name: "JetBrains Mono", data: font, weight: 700, style: "normal" }]
    : []

  const res = new ImageResponse(ogCard(opts), {
    width: W,
    height: H,
    fonts,
  })
  return Buffer.from(await res.arrayBuffer())
}

export const OG_SIZE = { width: W, height: H }
