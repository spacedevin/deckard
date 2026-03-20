#!/usr/bin/env node
/**
 * Demo: fake token stream (tpl.stream_chunk char-by-char) then tpl.block (asap).
 * Human browser hears the patch; editing wsdemo_* tracks in Song as human takes ownership — stream stops changing those tracks.
 *
 * Usage: npm run token-demo
 * Requires: npm run gateway (session default)
 */
const WebSocket = require("ws");

const hub = process.env.CODJ_HUB || "ws://127.0.0.1:35987";
const session = process.env.CODJ_SESSION || "default";
const actorId = "demo-stream";
const authorId = "token-demo";
const chunkMs = Number(process.env.TOKEN_CHUNK_MS || 12);

const patches = [
  [
    "tpl 1",
    "bpm 118",
    "track WsKick id wsdemo_k1 gen noise_burst",
    "  noise attack 0.001 decay 0.07 tone 0.82 pitch_follow 0.06",
    "  steps x . . . x . . . x . . . x . . .",
    "track WsHat id wsdemo_h1 gen noise_burst",
    "  noise attack 0.001 decay 0.03 tone 0.96 pitch_follow 0.3",
    "  steps . . x . . . x . . . x . . . x .",
  ],
  [
    "tpl 1",
    "bpm 124",
    "track WsKick id wsdemo_k1 gen noise_burst",
    "  noise attack 0.001 decay 0.05 tone 0.88 pitch_follow 0.1",
    "  steps x . x . x . x . x . x . x . x .",
    "track WsHat id wsdemo_h1 gen noise_burst",
    "  noise attack 0.001 decay 0.028 tone 0.96 pitch_follow 0.28",
    "  steps euclid 5 16",
  ],
  [
    "tpl 1",
    "bpm 120",
    "track WsKick id wsdemo_k1 gen noise_burst",
    "  noise attack 0.001 decay 0.08 tone 0.78 pitch_follow 0.12",
    "  steps x x . . x x . . x x . . x x . .",
    "track WsHat id wsdemo_h1 gen noise_burst",
    "  noise attack 0.001 decay 0.02 tone 0.98 pitch_follow 0.35",
    "  steps euclid 7 16",
  ],
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function connect() {
  const url = hub.replace(/\/$/, "");
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "join",
          sessionId: session,
          actorId,
          channelIds: ["default"],
          skillIds: ["add_track", "adjust_instrument", "pattern_steps", "pattern_piano", "channel_mix", "master_mixer"],
        })
      );
      resolve(ws);
    });
    ws.on("error", reject);
  });
}

async function streamThenCommit(ws, lines) {
  const text = lines.join("\n");
  for (let i = 0; i < text.length; i++) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "tpl.stream_chunk",
        actorId,
        authorId,
        chunk: text[i],
      })
    );
    await sleep(chunkMs);
  }
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: "tpl.block",
      actorId,
      authorId,
      lines,
      asap: true,
    })
  );
}

async function main() {
  console.log("Token stream demo →", hub, "session:", session, "actor:", actorId);
  console.log("In the app: Co-DJ → Connect (session default) → Play.");
  console.log("Edit Song on wsdemo_k1 / wsdemo_h1 as human to lock stream out of those tracks.\n");

  const ws = await connect();
  ws.on("message", (d) => {
    try {
      const m = JSON.parse(String(d));
      if (m.type === "joined") console.log("joined hub");
    } catch (_) {}
  });
  ws.on("close", () => {
    console.log("disconnected");
    process.exit(0);
  });

  let i = 0;
  while (ws.readyState === WebSocket.OPEN) {
    await sleep(2500);
    await streamThenCommit(ws, patches[i % patches.length]);
    i++;
    await sleep(6000);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
