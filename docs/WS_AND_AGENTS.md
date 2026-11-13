# WebSocket gateway and actor workers

This document specifies how actors (browser, worker) connect to a **session gateway**, exchange deck and direction text, and how workers persist memory in **SQLite + vectors**.

## 1. Session gateway

### 1.1 Transport

- **URL**: `ws://<host>:<port>` (e.g. **ws://127.0.0.1:35987**). No path; **first message** from client must be `join` and must include **`sessionId`**.
- **Framing**: each message is a **JSON object** (UTF-8 text frame). For high-volume token streams, clients may batch; gateway may reject frames &gt; 256 KiB.

### 1.2 Join handshake

First message from client **must** be `join` (must include **`sessionId`** and **`actorId`**):

```json
{
  "type": "join",
  "sessionId": "default",
  "actorId": "actor-uuid-123",
  "channelIds": ["default"],
  "skillIds": ["add_track", "adjust_instrument", "pattern_steps", "pattern_piano", "channel_mix", "master_mixer"]
}
```

Gateway responds:

```json
{
  "type": "joined",
  "sessionId": "...",
  "you": { "actorId": "...", "clientId": "...", "channelIds": ["default"] },
  "actors": ["actor-1", "actor-xyz"],
  "replay": []
}
```

- **`actors`**: list of actorIds in the channel.
- **`actorId`** (required): for **human** joins, the gateway picks a paired agent lane when exactly one agent is online (v1 prefers **`ai-a`**); otherwise `null`. Browsers show “No agent” until an agent connects.
- When anyone joins or leaves, the gateway broadcasts **`presence`**: `{ "type": "presence", "sessionId": "...", "actors": ["agent-1", "human-xyz"] }`.

### Human deck stream (Play)

While the browser actor is **playing**, the browser sends:

1. **`control`** `{ "type": "control", "op": "playing_start", "actorId": "...", "authorId": "...", "perfStep": <host 16th> }` — agents mark the session live and may run inference after buffered deck arrives.
2. **`deck.line`** per emitted deck line (throttled). The gateway stamps **`actorId`** from the connection and fans out.
3. **`control`** `{ "op": "playing_stop", ... }` on stop — agents clear live mode.

Agents append `deck.line` text from the playing actor to a rolling buffer and respond with **`deck.stream_chunk`** then **`deck.block`** with their own `actorId`.

### 1.3 Message families

| `type` | Direction | Fields |
|--------|-----------|--------|
| `deck.line` | any → gateway → fanout | `actorId`, `line`, `authorId`, `seq` (hub-assigned) |
| `deck.block` | any → gateway | `actorId`, `lines[]`, `authorId`, optional `effectivePerfStep`, `submitDeadlinePerfStep`, `asap` — see [STREAM_PROTOCOL.md](./STREAM_PROTOCOL.md) |
| `deck.stream_chunk` | worker → gateway → browsers | `actorId`, `chunk`, `authorId` (no seq until line commit) |
| `direct` | any → gateway → target actor | `targetActorId` (target), `text`, `authorId`, optional `perfStep` (host 16th index when sent) |
| `state.snapshot` | gateway or browser | `hash`, `tplPreview` (truncated), `ts` |
| `control` | master | `op`, `payload` — see [STREAM_PROTOCOL.md](./STREAM_PROTOCOL.md) |
| `error` | gateway → client | `code`, `message` |

Error `code`s **actually emitted** by `services/gateway/main.tish`: **`BAD_JSON`**, **`JOIN_BAD`**, **`JOIN_FIRST`**. Codes such as `SKILL_DENIED`, `LEASE_CONFLICT`, `PARSE_FAIL`, `RATE_LIMIT`, and `AUTH` are **aspirational** — skill / ownership violations are currently handled by the receiver **silently skipping** disallowed lines (see [DJ_SKILLS.md](./DJ_SKILLS.md)).

### 1.4 Ordering

- Gateway maintains **`seq` per `actorId`** (monotonic). All `deck.line` / `deck.block` / `direct` get a server timestamp + actor seq.
- Cross-lane order is **not** total; merge rules live in the browser ([CO_DJ_SPACE.md](./CO_DJ_SPACE.md)).

### 1.5 Rooms

- One **room** per `sessionId`. All joined clients receive fanout for messages they are allowed to see (v1: fanout all).

## 2. Worker contract (actor + skills)

The reference co-DJ is the **agentkit** ([`src/agentkit/`](../src/agentkit/), overview in
[ARCHITECTURE.md §8](./ARCHITECTURE.md)); the same runtime runs in a browser Web Worker, the `codj` CLI
(`services/codj-runner`) and the MCP server (`services/mcp`).

### 2.1 Process model

- One runtime **per actor** per session. It joins with `actorId`, `skillIds`, `displayName`, `kind: "agent"` and a
  Hypery access `token` (the gateway verifies it and binds the peer to that user).

### 2.2 Input loop

1. Keep a **mirror** of the room: adopt `state.snapshot` keyframes, fold `deck.delta`s in `rev` order (a gap →
   `request.snapshot`), and track the clock from `control` `tick` / `clock` frames.
2. Turn everything else (`chat` / `direct`, `edit.result`, `presence`, focus) into events for the co-DJ script
   (`onBar` / `onBeat` / `onMessage` / `onEvent`) and the agent loop.

### 2.3 Output loop

1. A script or the agent writes through the `codj.*` API; each write is **gate-reported** against the mirror
   (skills + ownership, [DJ_SKILLS.md](./DJ_SKILLS.md)) so rejected lines are reported immediately and never sent.
2. Accepted text is folded locally (optimistic) and sent as one **`deck.block`** with a `ref`. While the room plays
   it carries **`effectivePerfStep`** on the next bar (or beat) boundary; otherwise **`asap: true`**. The host
   answers with **`edit.result`** and publishes what it applied as `deck.delta`.
3. The agent itself (Hypery SDK `runAgentLoop`) mostly *writes the script* that does this every bar, rather
   than emitting blocks turn by turn.

### 2.4 Reconnect

- Resend `join` with the same `actorId` / `skillIds` / token; the gateway sends `joined` with `replay` (recent
  deltas) and the current snapshot; the mirror re-adopts and buffered deltas are re-applied. Script state
  (`codj.state`) survives in process; nothing is persisted across restarts.

## 3. SQLite + vector schema (Planned)

> **Planned / not implemented.** Co-DJ runtimes are **in-memory only**: they do not open SQLite, embed chunks, or run vector/RAG retrieval. The schema below is a **forward-looking spec** for agent memory, kept here as the target design.

Path: e.g. `~/.deckard-sessions/<sessionId>.sqlite` (agent-local) or shared if gateway persists.

### 3.1 Tables (SQL)

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- tpl | direct | system | tpl_out
  body TEXT NOT NULL,
  hub_seq INTEGER,
  ts INTEGER NOT NULL
);

CREATE TABLE tpl_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  tpl_text TEXT NOT NULL,
  ts INTEGER NOT NULL
);

CREATE TABLE chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  source TEXT NOT NULL,  -- tpl | direct | doc
  text TEXT NOT NULL,
  ts INTEGER NOT NULL
);

-- Embedding storage: use sqlite-vec / sqlite-vss extension:
-- CREATE VIRTUAL TABLE chunk_embeddings USING vec0(
--   chunk_id INTEGER,
--   embedding FLOAT[1536]  -- dimension matches model
-- );

CREATE TABLE agent_memory (
  session_id TEXT PRIMARY KEY,
  summary TEXT,
  updated_ts INTEGER
);
```

### 3.2 Vector index

- **sqlite-vec** or **sqlite-vss**: store `chunk_id` + embedding; on ingest, chunk deck lines (~512 chars) and `direct` messages; query with same embedding model as ingest.
- **Fallback**: no extension — keyword search on `chunks.text` only.

### 3.3 Embedding model

- Fix **one** model per deployment (e.g. `text-embedding-3-small`, 1536-d). Document in agent `.env`.

## 4. Security notes

- **Token** on WS URL for v1 stub auth.
- **direct** channel: treat as user input; strip control chars; max length 8 KiB.
- Rate-limit `deck.line` per `actorId` (e.g. 30/sec).

## 5. Reference implementation layout

- **`services/gateway/`** — Tish: `npm run gateway` (or `tish run --features ws,process services/gateway/main.tish`). Listens on **ws://127.0.0.1:35987** (or `CODJ_HUB_PORT`).
- **`services/codj-runner/`** — headless co-DJ (`npm run build:codj-cli`, then `npm run codj:login` and `npm run codj -- run <script.js> [--agent]`, or `npm run agent:client` / `agent:host`). Hosts a hot-reloaded JS co-DJ script; `--agent` adds a Hypery agent that writes it.
- **`services/mcp/`** — the same peer over MCP stdio for external agents ([README](../services/mcp/README.md)).

See repository `package.json` / README for run commands.

## 6. Troubleshooting

### Agent gets "HTTP error: 200 OK" when connecting

The WebSocket gateway responds with **101 Switching Protocols**, not 200. A **200 OK** response means another process is handling the port (e.g. an old Node server or another HTTP server).

1. **Start the gateway first**: `npm run gateway` — you should see `WebSocket server listening on ws://0.0.0.0:35987`.
2. **Check what is using the port**: with the gateway running, run:
   ```bash
   lsof -i :35987
   ```
   You should see a single process (the `tish` gateway). If you see another process (e.g. `node`), stop it so only the gateway is listening.
3. **Then start the co-DJ**: `npm run agent:client` (or `npm run codj -- run <script.js>`).
