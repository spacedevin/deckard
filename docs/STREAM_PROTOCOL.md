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
  "op": "DECK_LINE | DECK_BLOCK | DIRECT | CONTROL",
  "target": { "channelId": "c0", "domain": "mix | steps | gen | notes | auto" },
  "payload": "single deck line or object",
  "clientSeq": 42
}
```

Hub responds with `{ "ok": true, "seq": 17 }` or `{ "ok": false, "code": "SKILL_DENIED", "message": "..." }`.

## 2. Scheduling (perf step / lookahead)

The host advances **`perfStep`** in **16th-note steps** (one sequencer column per step; 16 steps per 4/4 bar). Agents should target **future** steps, not “now”.

| Field | On `deck.block` | Meaning |
|-------|----------------|---------|
| `effectivePerfStep` | optional | Apply merge when host `perfStep >= this`. If omitted (and no `@ perf_step` in deck), block is **ASAP**. |
| `submitDeadlinePerfStep` | optional | If host `perfStep` **exceeds** this when the message is received, **drop** (late delivery). Omit = no deadline check. |
| `asap` | optional | If `true`, ignore schedule and apply immediately when received. |

Implemented in [src/codj/Schedule.tish](../src/codj/Schedule.tish) (`coDjHandleIncomingTplBlock` → `coDjFlushScheduledForStep`): late deliveries are dropped, `asap`/due blocks apply immediately, future blocks queue and flush when the playhead reaches `effectivePerfStep`. Queued blocks carry the sender's `skillIds` so skill-gating is re-checked at apply time.

**Sequence lookahead**: one sequence = **64** sixteenth steps (four 4/4 bars). Remote lanes may schedule blocks up to **4 sequences** ahead: `effectivePerfStep = hostPerfStep + 256`. Use `submitDeadlinePerfStep` at least `hostPerfStep + 384` (or omit) so delivery is not dropped while the playhead catches up.

**`direct`** from browser may include **`perfStep`** (host’s current step when the human sent the message) so the agent can compute `effectivePerfStep` and deadline relative to that instant.

## 3. WebSocket message types

See [WS_AND_AGENTS.md](./WS_AND_AGENTS.md). Summary:

| type | Purpose |
|------|---------|
| `join` / `joined` | Handshake |
| `deck.line` | One completed deck line |
| `deck.block` | Multiple lines atomically (+ optional schedule fields above) |
| `deck.stream_chunk` | Live typing (agents) |
| `direct` | Natural-language direction to a target actor |
| `state.snapshot` | Resync |
| `error` | Rejection |

Every fanned-out message also carries **`skillIds`** — the gateway stamps the sender's declared `skillIds` (from `join`) onto each forwarded message ([services/gateway/main.tish](../services/gateway/main.tish)) so receivers can enforce skill-gating on apply. See [CO_DJ_SPACE.md](./CO_DJ_SPACE.md) and [src/codj/Skills.tish](../src/codj/Skills.tish).

## 4. Control ops (master)

Payload for `type: control`, `op`:

| op | payload | status |
|----|---------|--------|
| `clear_overlay` | `{ channelId? }` empty = all | **Implemented** (browser-side, [src/ui/CoDjPanel.tish](../src/ui/CoDjPanel.tish)) |
| `take_track` | `{ channelId }` | *Planned* |
| `release_track` | `{ channelId }` | *Planned* |
| `set_master` | `{ authorId }` — host-only | *Planned* |
| `master_overwrite` | `{ channelId, tplFragment }` | *Planned* |

Only `clear_overlay` is handled today (it drops all overlays in scope on the receiving browser); the other ops are not yet wired.

## 5. Error codes

Codes the gateway actually emits ([services/gateway/main.tish](../services/gateway/main.tish)):

| code | Meaning |
|------|---------|
| `BAD_JSON` | Message was not valid JSON |
| `JOIN_BAD` | `join` missing a valid `actorId` |
| `JOIN_FIRST` | A non-`join` message arrived before joining |

These are *Planned* (not yet emitted):

| code | Meaning |
|------|---------|
| `SKILL_DENIED` | Lane lacks skill for op |
| `LEASE_CONFLICT` | Track owned by another lane / master lock |
| `PARSE_FAIL` | deck invalid |
| `RATE_LIMIT` | Too many lines/sec |
| `AUTH` | Bad token |

Skill-gating is enforced today, but **not** via an error code: the receiver silently skips master-scope lines an actor's `skillIds` do not permit ([src/codj/Skills.tish](../src/codj/Skills.tish), [src/codj/Merge.tish](../src/codj/Merge.tish)).

## 6. Examples

**Human line**

```json
{ "type": "deck.line", "actorId": "human-xyz", "line": "  mix gain 0.9 pan 0", "authorId": "u1" }
```

**Direct to AI-A** (with perf step for scheduling)

```json
{ "type": "direct", "targetActorId": "agent-1", "text": "add euclidean 5/16 hi-hat pattern", "authorId": "u1", "perfStep": 120 }
```

**deck.block scheduled for step 200, must arrive by 180**

```json
{
  "type": "deck.block",
  "actorId": "agent-1",
  "authorId": "agent",
  "lines": ["deck 1", "track H id h1 gen noise_burst", "  steps euclid 5 16"],
  "effectivePerfStep": 200,
  "submitDeadlinePerfStep": 180
}
```
