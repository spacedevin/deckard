#!/usr/bin/env node
/**
 * Agent worker: connects as ai-a / ai-b, logs to SQLite, responds to `direct`.
 *
 * Env (optional `.env` in repo root or cwd — existing shell vars win):
 *   GRADIENT_MODEL_ACCESS_KEY — serverless inference (primary)
 *   MODEL_ACCESS_KEY — fallback if GRADIENT_* unset
 *   DIGITALOCEAN_API_TOKEN — use for DigitalOcean API (e.g. key management); not used for chat inference
 *
 * Without a model access key: keyword demo only (euclid/hat, bass/fm).
 * With key: DigitalOcean Gradient serverless inference — see
 * https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-serverless-inference/
 */
const fs = require("fs");
const WebSocket = require("ws");
const path = require("path");

function loadDotEnv() {
  const dirs = [process.cwd(), path.join(__dirname, "..", "..")];
  for (const dir of dirs) {
    const p = path.join(dir, ".env");
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
    return;
  }
}
loadDotEnv();

let lane = "ai-a";
let hub = "ws://127.0.0.1:8765";
let session = "default";
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--lane" && argv[i + 1]) lane = argv[++i];
  else if (argv[i] === "--hub" && argv[i + 1]) hub = argv[++i];
  else if (argv[i] === "--session" && argv[i + 1]) session = argv[++i];
}

const DO_BASE = (process.env.DO_INFERENCE_BASE || "https://inference.do-ai.run/v1").replace(/\/$/, "");
const DO_MODEL = process.env.DO_MODEL || "llama3-8b-instruct";
/** Serverless inference Bearer token (chat/completions) */
const GRADIENT_MODEL_ACCESS_KEY =
  process.env.GRADIENT_MODEL_ACCESS_KEY || process.env.MODEL_ACCESS_KEY || "";

const TPL_SYSTEM = `You are a co-DJ for a tiny track language (TPL). Output ONLY TPL lines — no markdown, no explanation.

Format:
tpl 1
track <Name> id <unique_id> gen <generator>
  <generator params as indented key value pairs>
  steps <pattern or euclid HITS STEPS>

Generators: noise_burst (noise attack decay tone pitch_follow), fm (fm ratio mod_index carrier sine|square mod sine|square, adsr a d s r, steps ...).

Examples:
- Hi-hat euclid: steps euclid 5 16
- Step grid: steps x . x . x . x . x . x . x . x .

Reply with complete valid TPL for the user's request. Use lane-unique track ids like ai-a_hat.`;

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

function normalizeTpl(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim();
  s = s.replace(/^```[\w]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  if (!s) return null;
  const lines = s.split("\n").map((l) => l.trimEnd());
  const nonEmpty = lines.filter((l) => l.length > 0);
  if (nonEmpty.length === 0) return null;
  if (!nonEmpty[0].toLowerCase().startsWith("tpl ")) {
    return ["tpl 1", ...nonEmpty].join("\n");
  }
  return nonEmpty.join("\n");
}

async function llmToTpl(userText) {
  if (!GRADIENT_MODEL_ACCESS_KEY) return null;
  const url = `${DO_BASE}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GRADIENT_MODEL_ACCESS_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DO_MODEL,
      messages: [
        { role: "system", content: TPL_SYSTEM },
        {
          role: "user",
          content: userText?.trim() || "Add a subtle rhythmic element for the track.",
        },
      ],
      temperature: 0.65,
      max_completion_tokens: 600,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[DO inference]", res.status, text.slice(0, 500));
    return null;
  }
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    return null;
  }
  const content = j.choices?.[0]?.message?.content;
  return normalizeTpl(content);
}

const url = hub.replace(/\/$/, "") + "/session/" + encodeURIComponent(session);
const ws = new WebSocket(url);

ws.on("open", () => {
  ws.send(JSON.stringify({ type: "join", role: "agent", laneId: lane, sinceSeq: {} }));
  console.log("joined", session, "as", lane);
  if (GRADIENT_MODEL_ACCESS_KEY) {
    console.log("LLM:", DO_MODEL, "@" + DO_BASE);
  } else {
    console.log(
      "Demo mode: euclid/hat/bass/fm — or set GRADIENT_MODEL_ACCESS_KEY in .env for AI"
    );
  }
});

ws.on("message", (data) => {
  let msg;
  try {
    msg = JSON.parse(String(data));
  } catch {
    return;
  }
  if (msg.type === "joined") return;
  if (msg.type === "direct" && msg.laneId === lane) {
    logMsg("direct", msg.text || "");
    const perfStep = Number(msg.perfStep);
    const nowStep = perfStep === perfStep && perfStep >= 0 ? Math.floor(perfStep) : 0;
    const LOOKAHEAD_STEPS = 64;
    const DEADLINE_AFTER_SEND = 48;

    (async () => {
      let demo = null;
      if (GRADIENT_MODEL_ACCESS_KEY) {
        try {
          demo = await llmToTpl(msg.text || "");
        } catch (e) {
          console.error(e);
        }
      }
      if (!demo) demo = buildDemoPatch(msg.text || "");
      if (!demo) {
        console.log("[agent] no TPL for direct:", (msg.text || "").slice(0, 80));
        return;
      }
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
    })();
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
  const lower = text.toLowerCase();
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
      "  steps x . x . x . x . x . x . x . x .",
    ].join("\n");
  }
  return null;
}

ws.on("close", () => process.exit(0));
ws.on("error", (e) => console.error(e.message));
