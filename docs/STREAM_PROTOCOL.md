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
| `join` / `joined` | Handshake (`joined.replay` = host deltas since the cached snapshot) |
| `presence` | Room roster changed (`actors`, `hostActorId`, `roster[]`) |
| `deck.line` | One completed deck line |
| `deck.block` | Multiple lines atomically (+ optional schedule fields above) |
| `deck.put` | A follower's WHOLE deck (replace-my-deck) |
| `deck.delta` | Host: one local edit, as the deck fragment its ingest folded |
| `deck.stream_chunk` | Live typing (agents) |
| `direct` | Natural-language direction to a target actor |
| `chat` | Room chat; `targetActorId` addresses one actor |
| `edit.result` | Host: what its fold kept / dropped from a peer's frame |
| `focus` | Host: the track the human is working on |
| `state.snapshot` / `request.snapshot` | Keyframe / ask the host for one |
| `grant` / `granted` | Room owner hands skills (e.g. `master_mixer`) to an actor |
| `error` | Rejection |

Every fanned-out message also carries **`skillIds`**: the gateway ALWAYS stamps the skills it holds for the sender (declared at `join`, capped by Hypery identity, widened only by a `grant`) onto each forwarded message ([services/gateway/main.tish](../services/gateway/main.tish)), so a frame can never claim `master_mixer` for itself. Receivers enforce skill-gating on apply. See [CO_DJ_SPACE.md](./CO_DJ_SPACE.md) and [src/codj/Skills.tish](../src/codj/Skills.tish). The full catalog of what a host publishes is §7.

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
| `AUTH` | Missing/rejected Hypery token (tokenless joins need `--allow-anon` / `CODJ_ALLOW_ANON=1`) |
| `ROOM_FULL` | Room already has 4 actors |
| `HOST_ONLY` | A non-host sent a host-only frame (`deck.delta`, `edit.result`, `focus`, `levels`) |
| `GRANT_DENIED` | A `grant` from someone who isn't the room owner |

Per-line outcomes are reported by the HOST in `edit.result.rejected[].code` (computed by
[src/codj/Gate.tish](../src/codj/Gate.tish) with the same rules the fold applies):

| code | Meaning |
|------|---------|
| `SKILL_DENIED` | Master-scope line from a lane without `master_mixer` |
| `NOT_OWNER` | Track owned by another actor / master-locked |
| `PARSE_FAIL` | The deck language rejected the line |
| `PRIVATE` | `@ cue` / `@ transport preview` never leave the sender's machine |
| `LATE` | The block arrived after its `submitDeadlinePerfStep` |

`RATE_LIMIT` is still *planned*.

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

## 7. What the host publishes (everything that happens in a room)

The room's source of truth is the host's fold. Everything that changes it, or tells you where the music is, is
published — and almost all of it is **deck**, so a listener only needs one parser. Frame builders live in
[src/codj/Protocol.tish](../src/codj/Protocol.tish); a complete client is [src/agentkit/Mirror.tish](../src/agentkit/Mirror.tish).

| what happened | frame | payload |
|---|---|---|
| Host edited anything (knob, step, note, track, master) | `deck.delta` | `{ rev, gen, text, perfStep }` — `text` is the exact deck fragment folded |
| Follower changed its deck | `deck.put` | `{ lines }` — the follower's whole deck |
| Agent / peer sent lines | `deck.block` | `{ lines, effectivePerfStep?, asap? }` |
| Launch / transport / FX throw / vinyl move | `deck.block` | `@ launch …`, `@ transport …`, `@ fx …`, `@ deck …` lines |
| Play / stop | `control` | `op: playing_start \| playing_stop`, `perfStep`, `playMode` |
| Bar boundary (while playing) | `control` | `op: clock`, `perfStep`, `scene`, `bpm`, `playMode` |
| Beat (while playing) | `control` | `op: tick`, `perfStep`, `bpm` |
| Peer's frame folded | `edit.result` | `{ fromActorId, ref, status, accepted, rejected[] }` |
| Human selected a track | `focus` | `{ trackId }` |
| Someone spoke | `chat` | `{ text, displayName, targetActorId? }` |
| Someone joined / left / was granted | `presence` | `{ actors, hostActorId, roster[{ actorId, displayName, kind, role, skillIds, userId, host }] }` |
| Keyframe (join, resync, after edits) | `state.snapshot` | `{ lines, owners, gen, rev }` |

**Mirror algorithm.** Adopt the newest `state.snapshot` (by `gen`), remember its `rev`, then fold `deck.delta`
frames in `rev` order (skip `rev <= snapshot.rev`). A `rev` jump means a missed delta: send `request.snapshot`
and wait for the keyframe. Fold `deck.put` / `deck.block` from other actors with the sender's `actorId` +
stamped `skillIds` — the same gated path every browser uses ([src/core/Ingest.tish](../src/core/Ingest.tish)).
`joined.replay` carries the deltas since the cached snapshot, so a late joiner is current immediately.

Per-track audio levels (`levels`) are reserved in the fan-out list but not published yet — the browser has no
per-track meter on its signal bus.
