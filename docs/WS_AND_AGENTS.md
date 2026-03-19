# WebSocket hub and AI agent workers

This document specifies how browsers and per-lane AI agents connect to a **session hub**, exchange TPL and direction text, and how agents persist memory in **SQLite + vectors**.

## 1. Session hub

### 1.1 Transport

- **URL**: `ws://<host>:<port>/session/<sessionId>?token=<optional>`
- **Framing**: each message is a **JSON object** (UTF-8 text frame). For high-volume token streams, clients may batch; hub may reject frames &gt; 256 KiB.

### 1.2 Join handshake

First message from client **must** be `join`:

```json
{
  "type": "join",
  "role": "browser-human | browser-viewer | agent",
  "laneId": "human | ai-a | ai-b",
  "agentId": "optional-stable-id",
  "sinceSeq": { "human": 0, "ai-a": 0, "ai-b": 0 }
}
```

Hub responds:

```json
{
  "type": "joined",
  "sessionId": "...",
  "you": { "clientId": "uuid", "laneId": "ai-a" },
  "agentLanes": ["ai-a"],
  "pairedAgentLane": "ai-a",
  "replay": [ /* messages with seq > sinceSeq for subscribed lanes */ ]
}
```

- **`agentLanes`**: agent lanes currently connected in the room (e.g. `["ai-a"]`).
- **`pairedAgentLane`**: for **human** joins, the hub picks a paired agent lane when exactly one agent is online (v1 prefers **`ai-a`**); otherwise `null`. Browsers show “No agent” until an agent connects.
- When an agent joins or leaves, the hub broadcasts **`presence`**: `{ "type": "presence", "sessionId": "...", "agentLanes": ["ai-a"] }` so late humans update pairing.

### Human TPL stream (Play)

While the human is **playing**, the browser sends:

1. **`control`** `{ "type": "control", "op": "human_play", "laneId": "human", "authorId": "...", "perfStep": <host 16th> }` — agent marks the session live and may run inference after buffered TPL arrives.
2. **`tpl.line`** per emitted TPL line with **`laneId": "human"`** (throttled). The hub **does not echo** these back to the sender.
3. **`control`** `{ "op": "human_stop", ... }` on stop — agent clears live mode.

Agents append human `tpl.line` text to a rolling buffer and respond with **`tpl.stream_chunk`** then **`tpl.block`** on their lane (e.g. `ai-a`).

### 1.3 Message families

| `type` | Direction | Fields |
|--------|-----------|--------|
| `tpl.line` | any → hub → fanout | `laneId`, `line`, `authorId`, `seq` (hub-assigned) |
| `tpl.block` | any → hub | `laneId`, `lines[]`, `authorId`, optional `effectivePerfStep`, `submitDeadlinePerfStep`, `asap` — see [STREAM_PROTOCOL.md](./STREAM_PROTOCOL.md) |
| `tpl.stream_chunk` | agent → hub → browsers | `laneId`, `chunk`, `authorId` (no seq until line commit) |
| `direct` | browser → hub → agents | `laneId` (target), `text`, `authorId`, optional `perfStep` (host 16th index when sent) |
| `state.snapshot` | hub or browser | `hash`, `tplPreview` (truncated), `ts` |
| `control` | master | `op`, `payload` — see [STREAM_PROTOCOL.md](./STREAM_PROTOCOL.md) |
| `error` | hub → client | `code`, `message` |

### 1.4 Ordering

- Hub maintains **`seq` per `laneId`** (monotonic). All `tpl.line` / `tpl.block` / `direct` get a server timestamp + lane seq.
- Cross-lane order is **not** total; merge rules live in the browser ([CO_DJ_SPACE.md](./CO_DJ_SPACE.md)).

### 1.5 Rooms

- One **room** per `sessionId`. All joined clients receive fanout for messages they are allowed to see (agents subscribe to full session; viewers may get filtered events — v1: fanout all).

## 2. Agent worker contract

### 2.1 Process model

- One worker **per agent lane** per session (e.g. `ai-a`), or a **pool** with one job per `(sessionId, laneId)`.
- Worker connects as `role: agent`, `laneId: ai-a`.

### 2.2 Input loop

1. On each inbound `tpl.line` / `tpl.block` (other lanes or merged snapshot): append to local DB, optionally embed chunks.
2. On each `direct` where `laneId` matches this agent: enqueue as **user turn** for LLM.
3. On timer or debounce: build context = system prompt + last N messages + **RAG** top-k from `chunks`.

### 2.3 Output loop

1. Stream model tokens; on each newline in output, emit `tpl.line` to hub.
2. Optionally emit `tpl.stream_chunk` for UI typing indicator.
3. Validate TPL line against allowlist ([DJ_SKILLS.md](./DJ_SKILLS.md)); if invalid, log and skip or send `error` to hub.
4. For **`tpl.block`**: set **`effectivePerfStep`** to **host `perfStep` + lookahead** (default **64** sixteenths ≈ four 4/4 bars). Set **`submitDeadlinePerfStep`** to host step + slack (e.g. **48**) so the host drops the block if it arrives too late. Omit both and use **`asap: true`** for emergency edits. Alternatively put **`@ perf_step N`** as the first line of TPL (parsed by host; same as `effectivePerfStep`).

### 2.4 Reconnect

- Resend `join` with `sinceSeq` from last persisted seq per lane; hub sends `replay` or worker loads from SQLite `messages`.

## 3. SQLite + vector schema

Path: e.g. `~/.tish-midi-sessions/<sessionId>.sqlite` (agent-local) or shared if hub persists.

### 3.1 Tables (SQL)

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  lane_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- tpl | direct | system | tpl_out
  body TEXT NOT NULL,
  hub_seq INTEGER,
  ts INTEGER NOT NULL
);

CREATE TABLE tpl_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  lane_id TEXT NOT NULL,
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
- Rate-limit `tpl.line` per `laneId` (e.g. 30/sec).

## 5. Reference implementation layout

- `services/ws-hub/` — Node + `ws` package, `npm start`.
- `services/agent-worker/` — Node; repo `.env` for **`GRADIENT_MODEL_ACCESS_KEY`** (inference), **`DIGITALOCEAN_API_TOKEN`** (DO API if needed); hub/session via flags / `CODJ_HUB`.

See repository `package.json` / README for run commands.
