#!/usr/bin/env node
/**
 * Co-DJ WebSocket hub: room per sessionId, fanout JSON messages, per-lane seq.
 * Tracks agent lanes; joined payload includes clientId, pairedAgentLane, agentLanes.
 * tpl.line / tpl.stream_chunk: no echo to sender.
 */
const http = require("http");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = Number(process.env.CODJ_HUB_PORT || 8765);

const rooms = new Map(); // sessionId -> { clients: Set<ws>, seq: { lane: n } }

function getRoom(sessionId) {
  if (!rooms.has(sessionId)) {
    rooms.set(sessionId, {
      clients: new Set(),
      seq: { human: 0, "ai-a": 0, "ai-b": 0 },
    });
  }
  return rooms.get(sessionId);
}

function collectAgentLanes(room) {
  const s = new Set();
  for (const c of room.clients) {
    if (c.readyState !== WebSocket.OPEN) continue;
    const j = c._codj;
    if (j && j.role === "agent") s.add(j.laneId || "ai-a");
  }
  return Array.from(s).sort();
}

function pairedAgentLane(agentLanes) {
  if (agentLanes.includes("ai-a")) return "ai-a";
  if (agentLanes.length > 0) return agentLanes[0];
  return null;
}

function nextSeq(room, laneId) {
  const lane = laneId || "human";
  if (room.seq[lane] === undefined) room.seq[lane] = 0;
  room.seq[lane] += 1;
  return room.seq[lane];
}

function broadcast(room, msg, except) {
  const s = typeof msg === "string" ? msg : JSON.stringify(msg);
  for (const c of room.clients) {
    if (c !== except && c.readyState === WebSocket.OPEN) c.send(s);
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("tish-midi Co-DJ hub — connect via WebSocket /session/<id>\n");
});

const wss = new WebSocket.Server({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const u = req.url || "";
  const m = u.match(/^\/session\/([^/?#]+)/);
  if (!m) {
    socket.destroy();
    return;
  }
  const sessionId = decodeURIComponent(m[1]);
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, sessionId);
  });
});

wss.on("connection", (ws, _req, sessionId) => {
  const room = getRoom(sessionId);
  let joined = false;
  let laneId = "human";
  let role = "unknown";

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      ws.send(JSON.stringify({ type: "error", code: "BAD_JSON", message: "invalid JSON" }));
      return;
    }

    if (!joined) {
      if (msg.type !== "join") {
        ws.send(JSON.stringify({ type: "error", code: "JOIN_FIRST", message: "send join first" }));
        return;
      }
      joined = true;
      laneId = msg.laneId || "human";
      role = msg.role || "client";
      const clientId = crypto.randomUUID();
      ws._codj = { sessionId, laneId, role, clientId };
      room.clients.add(ws);

      const agentLanes = collectAgentLanes(room);
      const paired = role === "agent" ? null : pairedAgentLane(agentLanes);

      ws.send(
        JSON.stringify({
          type: "joined",
          sessionId,
          you: { laneId, role, clientId },
          agentLanes,
          pairedAgentLane: paired,
          replay: [],
        })
      );

      if (role === "agent") {
        const lanes = collectAgentLanes(room);
        broadcast(
          room,
          { type: "presence", sessionId, agentLanes: lanes },
          null
        );
      }
      return;
    }

    const lane = msg.laneId || laneId;
    const seq = nextSeq(room, lane);
    const out = { ...msg, seq, sessionId };

    if (msg.type === "tpl.line" || msg.type === "tpl.block" || msg.type === "direct" || msg.type === "tpl.stream_chunk" || msg.type === "control") {
      let noEcho = null;
      if (
        (msg.type === "tpl.line" || msg.type === "tpl.stream_chunk") &&
        ws._codj &&
        (ws._codj.role === "browser-human" || ws._codj.laneId === "human")
      ) {
        noEcho = ws;
      } else if (
        msg.type === "control" &&
        (msg.op === "human_play" || msg.op === "human_stop") &&
        ws._codj &&
        ws._codj.role === "browser-human"
      ) {
        noEcho = ws;
      }
      broadcast(room, out, noEcho);
    }
  });

  ws.on("close", () => {
    const wasAgent = ws._codj && ws._codj.role === "agent";
    room.clients.delete(ws);
    if (room.clients.size === 0) {
      rooms.delete(sessionId);
    } else if (wasAgent) {
      const lanes = collectAgentLanes(room);
      broadcast(room, { type: "presence", sessionId, agentLanes: lanes }, null);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Co-DJ hub ws://127.0.0.1:${PORT}/session/<sessionId>`);
});
