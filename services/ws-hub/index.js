#!/usr/bin/env node
/**
 * Co-DJ WebSocket hub: room per sessionId, fanout JSON messages, per-lane seq.
 */
const http = require("http");
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
      ws._codj = { sessionId, laneId, role };
      room.clients.add(ws);
      ws.send(
        JSON.stringify({
          type: "joined",
          sessionId,
          you: { laneId, role },
          replay: [],
        })
      );
      return;
    }

    const lane = msg.laneId || laneId;
    const seq = nextSeq(room, lane);
    const out = { ...msg, seq, sessionId };

    if (msg.type === "tpl.line" || msg.type === "tpl.block" || msg.type === "direct" || msg.type === "tpl.stream_chunk" || msg.type === "control") {
      broadcast(room, out, null);
    }
  });

  ws.on("close", () => {
    room.clients.delete(ws);
    if (room.clients.size === 0) rooms.delete(sessionId);
  });
});

server.listen(PORT, () => {
  console.log(`Co-DJ hub ws://127.0.0.1:${PORT}/session/<sessionId>`);
});
