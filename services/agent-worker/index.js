#!/usr/bin/env node
/**
 * Agent worker: connects as ai-a / ai-b, logs to SQLite, demo tpl.block on direct.
 * Gateway: ws://host:8765 — first message must be join with sessionId.
 * Usage: node index.js --lane ai-a [--hub ws://127.0.0.1:8765] [--session default]
 */
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

let lane = "ai-a";
let hub = "ws://127.0.0.1:8765";
let session = "default";
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--lane" && argv[i + 1]) lane = argv[++i];
  else if (argv[i] === "--hub" && argv[i + 1]) hub = argv[++i];
  else if (argv[i] === "--session" && argv[i + 1]) session = argv[++i];
}

const dbPath = path.join(process.env.CODJ_DB_DIR || ".", `agent-${lane}-${session}.sqlite`);
let db = null;
try {
  const Database = require("better-sqlite3");
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      lane_id TEXT,
      role TEXT,
      body TEXT,
      ts INTEGER
    );
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      source TEXT,
      text TEXT,
      ts INTEGER
    );
  `);
  console.log("SQLite:", dbPath);
} catch (e) {
  console.warn("SQLite optional (npm install better-sqlite3):", e.message);
}

function logMsg(role, body) {
  if (!db) return;
  db.prepare(
    "INSERT INTO messages (session_id, lane_id, role, body, ts) VALUES (?,?,?,?,?)"
  ).run(session, lane, role, body, Date.now());
}

// Gateway: flat URL, first message is join with sessionId
const url = hub.replace(/\/$/, "") || "ws://127.0.0.1:8765";
const ws = new WebSocket(url);

ws.on("open", () => {
  ws.send(JSON.stringify({
    type: "join",
    sessionId: session,
    role: "agent",
    laneId: lane,
    sinceSeq: {},
  }));
  console.log("joined", session, "as", lane);
});

ws.on("message", (data) => {
  let msg;
  try {
    msg = JSON.parse(String(data));
  } catch {
    return;
  }
  if (msg.type === "joined") return;
  if (msg.type === "presence") return;
  if (msg.type === "direct" && msg.laneId === lane) {
    logMsg("direct", msg.text || "");
    const perfStep = Number(msg.perfStep);
    const nowStep = perfStep === perfStep && perfStep >= 0 ? Math.floor(perfStep) : 0;
    const LOOKAHEAD_STEPS = 64;
    const DEADLINE_AFTER_SEND = 48;
    const demo = buildDemoPatch(msg.text || "");
    if (demo) {
      ws.send(
        JSON.stringify({
          type: "tpl.block",
          laneId: lane,
          authorId: "agent-" + lane,
          lines: demo.split("\n"),
          effectivePerfStep: nowStep + LOOKAHEAD_STEPS,
          submitDeadlinePerfStep: nowStep + DEADLINE_AFTER_SEND,
        })
      );
    }
  }
  if (msg.type === "tpl.block" || msg.type === "tpl.line") {
    logMsg(msg.type, JSON.stringify(msg).slice(0, 2000));
    if (db && msg.line) {
      db.prepare("INSERT INTO chunks (session_id, source, text, ts) VALUES (?,?,?,?)").run(
        session,
        "tpl",
        msg.line,
        Date.now()
      );
    }
  }
});

function buildDemoPatch(text) {
  const lower = (text || "").toLowerCase();
  if (lower.includes("euclid") || lower.includes("hat") || lower.includes("hihat")) {
    return [
      "tpl 1",
      "track AgentHat id " + lane + "_hat gen noise_burst",
      "  noise attack 0.001 decay 0.04 tone 0.9 pitch_follow 0.1",
      "  steps euclid 5 16",
    ].join("\n");
  }
  if (lower.includes("bass") || lower.includes("fm")) {
    return [
      "tpl 1",
      "track AgentBass id " + lane + "_bass gen fm",
      "  fm ratio 2 mod_index 5 carrier sine mod square",
      "  adsr a 0.01 d 0.1 s 0.3 r 0.15",
      "  steps x . x . x . x . x . x . x . x . x . x .",
    ].join("\n");
  }
  return null;
}

ws.on("close", () => process.exit(0));
ws.on("error", (e) => console.error(e.message));
