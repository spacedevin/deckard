# WebSocket gateway and AI agent workers

This document specifies how browsers and AI agents (actors) connect to a **session gateway**, exchange TPL and direction text, and how agents persist memory in **SQLite + vectors**.

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
  "actorId": "human-uuid-123",
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
  "actors": ["agent-1", "human-xyz"],
  "replay": []
}
```

- **`actors`**: list of actorIds in the channel.
- **`actorId`** (required): for **human** joins, the gateway picks a paired agent lane when exactly one agent is online (v1 prefers **`ai-a`**); otherwise `null`. Browsers show “No agent” until an agent connects.
- When anyone joins or leaves, the gateway broadcasts **`presence`**: `{ "type": "presence", "sessionId": "...", "actors": ["agent-1", "human-xyz"] }`.

### Human TPL stream (Play)

While the browser actor is **playing**, the browser sends:

1. **`control`** `{ "type": "control", "op": "playing_start", "actorId": "...", "authorId": "...", "perfStep": <host 16th> }` — agents mark the session live and may run inference after buffered TPL arrives.
2. **`tpl.line`** per emitted TPL line (throttled). The gateway stamps **`actorId`** from the connection and fans out.
3. **`control`** `{ "op": "playing_stop", ... }` on stop — agents clear live mode.

Agents append `tpl.line` text from the playing actor to a rolling buffer and respond with **`tpl.stream_chunk`** then **`tpl.block`** with their own `actorId`.

### 1.3 Message families

| `type` | Direction | Fields |
|--------|-----------|--------|
| `tpl.line` | any → gateway → fanout | `actorId`, `line`, `authorId`, `seq` (hub-assigned) |
| `tpl.block` | any → gateway | `actorId`, `lines[]`, `authorId`, optional `effectivePerfStep`, `submitDeadlinePerfStep`, `asap` — see [STREAM_PROTOCOL.md](./STREAM_PROTOCOL.md) |
| `tpl.stream_chunk` | agent → gateway → browsers | `actorId`, `chunk`, `authorId` (no seq until line commit) |
| `direct` | browser → gateway → agents | `targetActorId` (target), `text`, `authorId`, optional `perfStep` (host 16th index when sent) |
| `state.snapshot` | gateway or browser | `hash`, `tplPreview` (truncated), `ts` |
| `control` | master | `op`, `payload` — see [STREAM_PROTOCOL.md](./STREAM_PROTOCOL.md) |
| `error` | gateway → client | `code`, `message` |

### 1.4 Ordering

- Gateway maintains **`seq` per `actorId`** (monotonic). All `tpl.line` / `tpl.block` / `direct` get a server timestamp + actor seq.
- Cross-lane order is **not** total; merge rules live in the browser ([CO_DJ_SPACE.md](./CO_DJ_SPACE.md)).

### 1.5 Rooms

- One **room** per `sessionId`. All joined clients receive fanout for messages they are allowed to see (agents subscribe to full session; viewers may get filtered events — v1: fanout all).

## 2. Agent worker contract

### 2.1 Process model

- One worker **per agent** per session (e.g. `agent-1`), or a **pool** with one job per `(sessionId, actorId)`.
- Worker connects with `actorId` (e.g. `agent-1`), `channelIds: ["default"]`, `skillIds: [...]`.

### 2.2 Input loop

1. On each inbound `tpl.line` / `tpl.block` (other actors or merged snapshot): append to local DB, optionally embed chunks.
2. On each `direct` where `targetActorId` matches this agent's `actorId`: enqueue as **user turn** for LLM.
3. On timer or debounce: build context = system prompt + last N messages + **RAG** top-k from `chunks`.

### 2.3 Output loop

1. Stream model tokens; on each newline in output, emit `tpl.line` to gateway.
2. Optionally emit `tpl.stream_chunk` for UI typing indicator.
3. Validate TPL line against actor's skills ([DJ_SKILLS.md](./DJ_SKILLS.md)); if invalid, log and skip or send `error` to gateway.
4. For **`tpl.block`**: set **`effectivePerfStep`** to **host `perfStep` + lookahead** (default **64** sixteenths ≈ four 4/4 bars). Set **`submitDeadlinePerfStep`** to host step + slack (e.g. **48**) so the host drops the block if it arrives too late. Omit both and use **`asap: true`** for emergency edits. Alternatively put **`@ perf_step N`** as the first line of TPL (parsed by host; same as `effectivePerfStep`).

### 2.4 Reconnect

- Resend `join` with same `actorId`, `channelIds`, `skillIds`; gateway sends `replay` or worker loads from SQLite `messages`.

## 3. SQLite + vector schema

Path: e.g. `~/.tish-midi-sessions/<sessionId>.sqlite` (agent-local) or shared if gateway persists.

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

- **sqlite-vec** or **sqlite-vss**: store `chunk_id` + embedding; on ingest, chunk TPL lines (~512 chars) and `direct` messages; query with same embedding model as ingest.
- **Fallback**: no extension — keyword search on `chunks.text` only.

### 3.3 Embedding model

- Fix **one** model per deployment (e.g. `text-embedding-3-small`, 1536-d). Document in agent `.env`.

## 4. Security notes

- **Token** on WS URL for v1 stub auth.
- **direct** channel: treat as user input; strip control chars; max length 8 KiB.
- Rate-limit `tpl.line` per `actorId` (e.g. 30/sec).

## 5. Reference implementation layout

- **`services/gateway/`** — Tish: `npm run gateway` (or `tish run --features ws,process services/gateway/main.tish`). Listens on **ws://127.0.0.1:35987** (or `CODJ_HUB_PORT`).
- **`services/agent-worker/`** — Tish agent: `npm run agent` (or `tish run --features ws,http,fs,process services/agent-worker/main.tish`). For **real LLM** responses, use the Node agent (see README there) until async/LLM is wired in Tish.

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
3. **Then start the agent**: `npm run agent`.
