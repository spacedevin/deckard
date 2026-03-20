# Stream protocol: envelope, WebSocket, control

## 1. JSON envelope (REST or queued ops)

```json
{
  "v": 1,
  "sessionId": "uuid",
  "actorId": "string",
  "authorId": "string",
  "layer": "canonical | ui_overlay",
  "master": false,
  "op": "TPL_LINE | TPL_BLOCK | DIRECT | CONTROL",
  "target": { "channelId": "c0", "domain": "mix | steps | gen | notes | auto" },
  "payload": "single TPL line or object",
  "clientSeq": 42
}
```

Hub responds with `{ "ok": true, "seq": 17 }` or `{ "ok": false, "code": "SKILL_DENIED", "message": "..." }`.

## 2. Scheduling (perf step / lookahead)

The host advances **`perfStep`** in **16th-note steps** (one sequencer column per step; 16 steps per 4/4 bar). Agents should target **future** steps, not “now”.

| Field | On `tpl.block` | Meaning |
|-------|----------------|---------|
| `effectivePerfStep` | optional | Apply merge when host `perfStep >= this`. If omitted (and no `@ perf_step` in TPL), block is **ASAP**. |
| `submitDeadlinePerfStep` | optional | If host `perfStep` **exceeds** this when the message is received, **drop** (late delivery). Omit = no deadline check. |
| `asap` | optional | If `true`, ignore schedule and apply immediately when received. |

**Sequence lookahead**: one sequence = **64** sixteenth steps (four 4/4 bars). Remote lanes may schedule blocks up to **4 sequences** ahead: `effectivePerfStep = hostPerfStep + 256`. Use `submitDeadlinePerfStep` at least `hostPerfStep + 384` (or omit) so delivery is not dropped while the playhead catches up.

**`direct`** from browser may include **`perfStep`** (host’s current step when the human sent the message) so the agent can compute `effectivePerfStep` and deadline relative to that instant.

## 3. WebSocket message types

See [WS_AND_AGENTS.md](./WS_AND_AGENTS.md). Summary:

| type | Purpose |
|------|---------|
| `join` / `joined` | Handshake |
| `tpl.line` | One completed TPL line |
| `tpl.block` | Multiple lines atomically (+ optional schedule fields above) |
| `tpl.stream_chunk` | Live typing (agents) |
| `direct` | Natural-language direction to a target actor |
| `state.snapshot` | Resync |
| `error` | Rejection |

## 4. Control ops (master)

Payload for `type: control`, `op`:

| op | payload |
|----|---------|
| `take_track` | `{ channelId }` |
| `release_track` | `{ channelId }` |
| `clear_overlay` | `{ channelId? }` empty = all |
| `set_master` | `{ authorId }` — host-only |
| `master_overwrite` | `{ channelId, tplFragment }` |

## 5. Error codes

| code | Meaning |
|------|---------|
| `SKILL_DENIED` | Lane lacks skill for op |
| `LEASE_CONFLICT` | Track owned by another lane / master lock |
| `PARSE_FAIL` | TPL invalid |
| `RATE_LIMIT` | Too many lines/sec |
| `AUTH` | Bad token |

## 6. Examples

**Human line**

```json
{ "type": "tpl.line", "actorId": "human-xyz", "line": "  mix gain 0.9 pan 0", "authorId": "u1" }
```

**Direct to AI-A** (with perf step for scheduling)

```json
{ "type": "direct", "targetActorId": "agent-1", "text": "add euclidean 5/16 hi-hat pattern", "authorId": "u1", "perfStep": 120 }
```

**tpl.block scheduled for step 200, must arrive by 180**

```json
{
  "type": "tpl.block",
  "actorId": "agent-1",
  "authorId": "agent",
  "lines": ["tpl 1", "track H id h1 gen noise_burst", "  steps euclid 5 16"],
  "effectivePerfStep": 200,
  "submitDeadlinePerfStep": 180
}
```
