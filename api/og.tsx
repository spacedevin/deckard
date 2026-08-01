import { ImageResponse } from "@vercel/og"
import type { ReactNode } from "react"

export const config = { runtime: "edge" }

const W = 1200
const H = 630

const BG = "#050507"
const PANEL = "#09090d"
const BORDER = "#14141c"
const TEXT = "#cccccc"
const MUTED = "#55555e"
const MINT = "#7cff7c"
const WARM = "#e8945c"

function clamp(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + "…"
}

function Fader({ top, knobs }: { top: number; knobs: number[] }): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "absolute",
        top,
        left: 86,
      }}
    >
      {knobs.map((x, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", position: "relative", width: 118, height: 14 }}>
          <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: MINT, opacity: 0.85 }} />
          <div
            style={{
              position: "absolute",
              left: x,
              width: 16,
              height: 14,
              background: MINT,
              borderRadius: 2,
            }}
          />
        </div>
      ))}
    </div>
  )
}

function DeckardMark(): ReactNode {
  return (
    <div
      style={{
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
      }}
    >
      {/* Geometric D */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 48,
          top: 36,
          width: 52,
          height: 208,
          background: WARM,
          borderRadius: 4,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 100,
          top: 36,
          width: 132,
          height: 208,
          border: `52px solid ${WARM}`,
          borderLeft: "none",
          borderRadius: "0 999px 999px 0",
        }}
      />
      {/* Counter hole */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 100,
          top: 88,
          width: 80,
          height: 104,
          background: PANEL,
          borderRadius: "0 999px 999px 0",
        }}
      />
      <Fader top={108} knobs={[8, 72, 40]} />
    </div>
  )
}

export function OgCard(props: { title: string; description: string; eyebrow?: string }): ReactNode {
  const title = clamp(props.title || "Deckard", 48)
  const description = clamp(
    props.description || "Token-streamed live-coding DAW — humans and agents co-DJ in deck.",
    140,
  )
  const eyebrow = clamp(props.eyebrow || "deckard.lol", 40)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BG,
        color: TEXT,
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Soft mint glow */}
      <div
        style={{
          position: "absolute",
          right: -120,
          top: -160,
          width: 520,
          height: 520,
          borderRadius: 999,
          background: "rgba(124, 255, 124, 0.08)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -160,
          bottom: -200,
          width: 560,
          height: 560,
          borderRadius: 999,
          background: "rgba(232, 148, 92, 0.07)",
          display: "flex",
        }}
      />

      {/* Sequencer dots */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 48,
          display: "flex",
          gap: 10,
        }}
      >
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              background: i % 4 === 0 ? MINT : BORDER,
              opacity: i % 4 === 0 ? 0.55 : 0.9,
              display: "flex",
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 80px 96px",
          gap: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, maxWidth: 680 }}>
          <div
            style={{
              display: "flex",
              color: MINT,
              fontSize: 22,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              color: WARM,
              fontSize: title.length > 28 ? 64 : 84,
              fontWeight: 700,
              letterSpacing: "0.04em",
              lineHeight: 1.05,
              marginBottom: 28,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              color: MUTED,
              fontSize: 28,
              lineHeight: 1.35,
              maxWidth: 640,
            }}
          >
            {description}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 36,
              color: MUTED,
              fontSize: 20,
              letterSpacing: "0.02em",
            }}
          >
            by space.la
          </div>
        </div>

        <DeckardMark />
      </div>
    </div>
  )
}

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    // Prefer TTF (Satori); JetBrains Mono Bold from upstream.
    const res = await fetch(
      "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Bold.ttf",
    )
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get("title") ?? "Deckard"
  const description =
    searchParams.get("description") ??
    searchParams.get("subtitle") ??
    "Token-streamed live-coding DAW — humans and agents co-DJ in deck."
  const eyebrow = searchParams.get("eyebrow") ?? "deckard.lol"

  const font = await loadFont()
  const fonts = font
    ? [{ name: "JetBrains Mono", data: font, weight: 700 as const, style: "normal" as const }]
    : []

  return new ImageResponse(
    <OgCard title={title} description={description} eyebrow={eyebrow} />,
    {
      width: W,
      height: H,
      fonts,
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    },
  )
}
