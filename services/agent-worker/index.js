#!/usr/bin/env node
/**
 * Agent worker: ai-a / ai-b — direct, human tpl.line stream, human_play/stop → LLM → stream + tpl.block
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
const GRADIENT_MODEL_ACCESS_KEY =
  process.env.GRADIENT_MODEL_ACCESS_KEY || process.env.MODEL_ACCESS_KEY || "";

let TPL_GRAMMAR = "";
try {
  const gp = path.join(__dirname, "..", "..", "docs", "TPL_AGENT_GRAMMAR.md");
  if (fs.existsSync(gp)) {
    TPL_GRAMMAR = fs.readFileSync(gp, "utf8").slice(0, 4000);
  }
} catch (_) {}
if (!TPL_GRAMMAR) {
  TPL_GRAMMAR = "TPL: tpl 1, track Name id X gen noise_burst|fm|basic_osc, steps, euclid.";
}
const AGENT_SYSTEM =
  TPL_GRAMMAR +
  "\n\nYou are lane " +
  lane +
  ". Human TPL is context only. Output ONLY new complementary TPL (one track/pattern). No markdown.";

const TPL_DIRECT = `You are a co-DJ. Output ONLY TPL lines — no markdown.

tpl 1 / track / gen noise_burst|fm / steps or euclid. Use ids like ${lane}_hat.`;

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
  console.warn("SQLite optional:", e.message);
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

async function llmChat(system, user) {
  if (!GRADIENT_MODEL_ACCESS_KEY) return null;
  const res = await fetch(`${DO_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GRADIENT_MODEL_ACCESS_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DO_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user.slice(0, 12000) },
      ],
      temperature: 0.65,
      max_completion_tokens: 700,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[DO]", res.status, text.slice(0, 400));
    return null;
  }
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    return null;
  }
  return normalizeTpl(j.choices?.[0]?.message?.content);
}

const STEPS_PER_SEQ = 64;
const MAX_SEQ_AHEAD = 4;
const LOOKAHEAD_STEPS = STEPS_PER_SEQ * MAX_SEQ_AHEAD;
const DEADLINE_SLACK = LOOKAHEAD_STEPS + 160;

const activeWs = { current: null };
const humanLines = [];
let humanLive = false;
let lastHumanPerf = 0;
let llmDebounce = null;
let humanResponseInFlight = false;

function pushHumanLine(line) {
  if (line == null || String(line).length === 0) return;
  humanLines.push(String(line));
  while (humanLines.length > 400) humanLines.shift();
}

function scheduleHumanResponse() {
  if (!humanLive) return;
  if (llmDebounce) clearTimeout(llmDebounce);
  llmDebounce = setTimeout(() => {
    llmDebounce = null;
    runHumanResponse();
  }, 1300);
}

async function runHumanResponse() {
  if (!humanLive || humanLines.length === 0 || humanResponseInFlight) return;
  humanResponseInFlight = true;
  const snap = humanLines.join("\n").slice(-7000);
  const user = `Human TPL stream (read-only):\n${snap}\n\nComplement with one short pattern on lane ${lane}.`;
  let tpl = null;
  try {
    tpl = await llmChat(AGENT_SYSTEM, user);
  } catch (e) {
    console.error("[agent] llm", e);
  }
  if (!tpl) tpl = buildDemoPatch("euclid hat");
  if (!tpl) {
    humanResponseInFlight = false;
    return;
  }
  const sock = activeWs.current;
  if (!sock || sock.readyState !== WebSocket.OPEN) {
    humanResponseInFlight = false;
    return;
  }
  const nowStep =
    Number.isFinite(lastHumanPerf) && lastHumanPerf >= 0
      ? Math.floor(lastHumanPerf)
      : 0;
  let i = 0;
  const body = tpl;
  const chunkSz = 36;
  function sendChunk() {
    const s = activeWs.current;
    if (!s || s.readyState !== WebSocket.OPEN) return;
    if (i < body.length) {
      s.send(
        JSON.stringify({
          type: "tpl.stream_chunk",
          laneId: lane,
          authorId: "agent-" + lane,
          chunk: body.slice(i, i + chunkSz),
        })
      );
      i += chunkSz;
      setTimeout(sendChunk, 12);
    } else {
      s.send(
        JSON.stringify({
          type: "tpl.block",
          laneId: lane,
          authorId: "agent-" + lane,
          lines: tpl.split("\n"),
          effectivePerfStep: nowStep + LOOKAHEAD_STEPS,
          submitDeadlinePerfStep: nowStep + DEADLINE_SLACK,
        })
      );
      console.log("[agent] human-stream → tpl.block +" + LOOKAHEAD_STEPS + " steps");
      humanResponseInFlight = false;
    }
  }
  sendChunk();
}

const wsUrl = hub.replace(/\/$/, "") + "/session/" + encodeURIComponent(session);
let reconnectTimer = null;
let loggedLlm = false;
const exitOnClose = process.env.CODJ_AGENT_EXIT_ON_CLOSE === "1";
const reconnectMs = Math.max(1000, Number(process.env.CODJ_AGENT_RECONNECT_MS || 3000));

function connectHub() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  humanLines.length = 0;
  humanLive = false;
  if (llmDebounce) {
    clearTimeout(llmDebounce);
    llmDebounce = null;
  }

  const ws = new WebSocket(wsUrl);
  activeWs.current = ws;

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "join", role: "agent", laneId: lane, sinceSeq: {} }));
    console.log("joined", session, "as", lane);
    if (!loggedLlm) {
      loggedLlm = true;
      if (GRADIENT_MODEL_ACCESS_KEY) {
        console.log("LLM:", DO_MODEL);
      } else {
        console.log("No GRADIENT_MODEL_ACCESS_KEY — human stream falls back to euclid demo");
      }
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

    if (msg.type === "control" && msg.op === "human_play") {
      humanLive = true;
      lastHumanPerf = Number(msg.perfStep) || 0;
      scheduleHumanResponse();
      return;
    }
    if (msg.type === "control" && msg.op === "human_stop") {
      humanLive = false;
      if (llmDebounce) {
        clearTimeout(llmDebounce);
        llmDebounce = null;
      }
      return;
    }

    if (msg.type === "tpl.line" && msg.laneId === "human" && msg.line !== undefined) {
      pushHumanLine(msg.line);
      logMsg("human_line", String(msg.line).slice(0, 500));
      if (humanLive) scheduleHumanResponse();
    }

    if (msg.type === "direct" && msg.laneId === lane) {
      logMsg("direct", msg.text || "");
      const perfStep = Number(msg.perfStep);
      const nowStep =
        perfStep === perfStep && perfStep >= 0 ? Math.floor(perfStep) : 0;
      (async () => {
        let demo = null;
        if (GRADIENT_MODEL_ACCESS_KEY) {
          try {
            demo = await llmChat(TPL_DIRECT, msg.text || "add hi-hat");
          } catch (e) {
            console.error(e);
          }
        }
        if (!demo) demo = buildDemoPatch(msg.text || "");
        if (!demo) {
          console.log("[agent] no TPL for direct");
          return;
        }
        const sock = activeWs.current;
        if (!sock || sock.readyState !== WebSocket.OPEN) return;
        sock.send(
          JSON.stringify({
            type: "tpl.block",
            laneId: lane,
            authorId: "agent-" + lane,
            lines: demo.split("\n"),
            effectivePerfStep: nowStep + LOOKAHEAD_STEPS,
            submitDeadlinePerfStep: nowStep + DEADLINE_SLACK,
          })
        );
      })();
    }

    if (msg.type === "tpl.block" || msg.type === "tpl.line") {
      if (msg.laneId !== "human" && msg.type === "tpl.line") {
        logMsg(msg.type, JSON.stringify(msg).slice(0, 2000));
      }
      if (db && msg.line && msg.laneId !== "human") {
        db.prepare("INSERT INTO chunks (session_id, source, text, ts) VALUES (?,?,?,?)").run(
          session,
          "tpl",
          msg.line,
          Date.now()
        );
      }
    }
  });

  ws.on("close", (code, reason) => {
    if (activeWs.current === ws) activeWs.current = null;
    const why = reason && reason.length ? ` (${String(reason)})` : "";
    if (exitOnClose) {
      console.log("disconnected", code + why);
      process.exit(0);
    }
    console.log("hub disconnected" + why + " — reconnect in " + reconnectMs + "ms");
    reconnectTimer = setTimeout(connectHub, reconnectMs);
  });

  ws.on("error", (e) => console.error("[ws]", e.message));
}

connectHub();

process.on("SIGINT", () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  process.exit(0);
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
