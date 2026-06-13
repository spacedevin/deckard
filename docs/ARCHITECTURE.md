# Deckard — Architecture & Overview

> A token-streamed, live-coding DAW. Agents and humans **co-DJ** by streaming a small
> line-oriented language (**TPL**) that the app **decodes into live-synthesised stems** —
> never WAV/audio files. Think *MIDI × live-coding, designed for LLM token streams, with a
> traditional DAW built on top.*

This document is the map of the whole project: where it came from, the core idea, the
end-to-end signal path, and how the subsystems fit together. For the language reference see
[TPL_GRAMMAR.md](TPL_GRAMMAR.md); for the wire protocol see [WS_AND_AGENTS.md](WS_AND_AGENTS.md)
and [STREAM_PROTOCOL.md](STREAM_PROTOCOL.md).

---

## 1. Product thesis — where this comes from

A normal collaborative DAW moves **audio** between participants (stems, WAVs, OT on a timeline).
That is heavy, hard for an LLM to author, and impossible to "improvise" token by token.

Deckard inverts it. The shared artifact is **text** — a compact patch language (**TPL**, the
*Tish Patch Language*) that describes instruments, patterns, mixing and automation. Every
participant — human or AI agent — **streams TPL lines** as the music evolves. The app holds the
synthesiser, so a streamed line like `steps euclid 5 16` *becomes sound* in the browser the moment
it arrives. Nothing is pre-rendered; **all audio is generated in-app from the token stream.**

That makes three things possible at once:

1. **LLMs are first-class performers.** A model emits TPL the same way a human edits a pattern.
   "Decode a song into live stems and DJ from there" is literally: stream TPL → synth graph → sound.
2. **Live coding meets a DAW.** The familiar surfaces (channel rack, piano roll, mixer, session/scene
   launcher) sit *on top of* the language; the language is the source of truth, the UI is a view.
3. **Many performers, one groove.** Multiple agents and humans share a session, each owning lanes
   and tracks, scheduling their contributions to **future beats** so they lock to the bar.

The project has been through several iterations (a Node.js service tier was rewritten in Tish; the
project schema went v1 → v2 with a per-channel *generator plugin* model; the streaming/co-DJ layer
was built out incrementally). This document reflects the **current** state after an
architecture-cleanup pass.

---

## 2. The stack

Everything is written in **[Tish](https://github.com/tishlang/tish)**, a language that compiles to
JavaScript. The UI uses **Lattish** ([LATTISH.md](LATTISH.md)), a small React-like layer
(`useState/useMemo/useRef/useEffect`, `createRoot`, and JSX that lowers to `h()`calls). The browser
app is built with `tish build --target js src/main.tish -o dist/bundle.js`; the services run under
the Tish interpreter with the `ws` / `http` / `process` features.

| Concern | Where |
|---------|-------|
| Streaming language (parse / apply / emit / stream) | `src/tpl/` |
| Data model (project = single source of truth) | `src/model/` |
| Synthesis & scheduling (the "stems") | `src/audio/`, `src/schedule/`, `src/generators/` |
| Co-DJ collaboration (lanes, merge, skills, scheduling) | `src/codj/` |
| DAW UI (Lattish/JSX) | `src/ui/` |
| WebSocket gateway, agent worker, demo bot | `services/` |

---

## 3. The core data model — project is the source of truth

A **project** (`src/model/Project.tish`) is a plain object that everything reads and writes:

```
project = {
  version: 2, bpm, transportMainDeck: "live"|"local",
  channels: [ channel… ],          // the instruments / tracks
  instrumentPresets: [ … ],        // named patches (incl. 13 factory matrix-FM presets)
  automation: { masterGain[], pitchBend[] },
  paramAutomations: [ … ],         // per-channel generator-param curves
  mixerAutomations: [ … ],         // track / actor-bus / master mixer curves
  session:    { sceneCount, slots[][] },   // Session-view scene grid
  masterMixer, actorMixer,         // mixer state for master + per-actor buses
  coDjMeta:   { tracks: { <id>: { ownerActorId, authorId, masterLock, lastTouchedPerfStep } } },
  coDjOverlays: [ … ]              // temporary UI overlays (e.g. MIDI gain)
}
```

Each **channel** is an FL-style *generator slot* (see [FL_STUDIO_GENERATORS.md](FL_STUDIO_GENERATORS.md)):
routing (`gain/pan/mute/solo` + 3-band `eqLo/eqMid/eqHi`), a `generatorId` selecting one instrument
plugin, and a `generatorParams` object whose **shape depends on the generator** (this is where ADSR
lives — *not* on the channel root). Pattern data is either a 16-step row (`steps`) or piano-roll
`pianoNotes`; `stepPitch` is the base MIDI note for step hits.

The model is the contract for agents: edit `Project.tish` / the schema
([schema/project-v2.json](schema/project-v2.json)) and the safe mutators in
`src/model/Edits.tish` rather than reaching into the UI. The UI channel-strip controls now route
through those `Edits.tish` setters, so UI edits and programmatic/agent edits share one mutation path.

---

## 4. TPL — the streaming token language (the centerpiece)

TPL is line-oriented and streamable. A full reference is in [TPL_GRAMMAR.md](TPL_GRAMMAR.md); the
shape:

```
tpl 1
bpm 118

track Kick id c0 gen noise_burst        # one channel = one generator
  mix gain 0.9 pan 0 eq_lo 0 eq_mid 0 eq_hi 0
  step_pitch 36
  noise attack 0.002 decay 0.12 tone 0.15 pitch_follow 0.35
  steps x . . . x . . . x . . . x . . .

track Bass id c3 gen fm
  fm ratio 1 mod_index 6 carrier sine mod sine
  adsr a 0.008 d 0.12 s 0.35 r 0.15
  note 48 0 0.5 v 90

master_mix eq_lo 0 eq_mid 0 eq_hi 0     # static mixer lines
actor_mix local gain 1 eq_lo 0 eq_mid 0 eq_hi 0
auto master_gain                        # automation curves
  0 1.0
  16 0.8
```

It also round-trips the **Session view** (`session_scenes`, `session_slot`, and `clip … bars …`
blocks) and heavy generators (`gen_block matrix_fm … end gen_block`, see
[TPL_EXTENSION.md](TPL_EXTENSION.md)). Deck routing (LIVE/CUE) is JSON/UI state and is intentionally
**not** part of TPL.

### Two decode paths — block and stream

| Path | Unit | Module | Use |
|------|------|--------|-----|
| **Atomic** | whole program / block | `src/tpl/Parser.tish` → `Apply.tish` (`applyTplSource`) | Editor *Apply*, JSON import, `tpl.block` over the wire |
| **Incremental** | one line at a time | `src/tpl/Stream.tish` (`tplLineStreamPush`) | `tpl.line` over the wire — progressive decode |

The atomic path (`parseProgram` → `applyParsed`) merges a complete program into the project by
channel id. The **incremental path** is what makes "stream a song into live stems" literal: a
non-indented statement (`track…`, `auto…`, `clip…`) opens a block, indented lines extend it, and the
growing block is re-applied (idempotently) on every line — so a remote actor's track **sounds the
instant its `track …` header arrives**, then the pattern fills in as `steps …` streams. Both paths
share the same ownership/skill enforcement via `applyCoDjTplSource`.

`src/tpl/Emit.tish` does the reverse — `project → TPL` — for the editor mirror, JSON↔TPL, and the
"what you send on Play" preview. Parser/apply/emit are a verified round-trip (see `test/smoke.tish`).

---

## 5. From tokens to sound — the synthesis path

The audio engine (`src/audio/Engine.tish`) builds a Web Audio graph with a three-tier mixer:

```
generator voice → [channel bus: lowpass → 3-band EQ → trim → pan]
                → [actor bus: EQ → trim]            (one bus per lane / actor)
                → [master: EQ → masterGain]
                → analyser → destination
```

The transport (`src/ui/App.tish` playback loop → `src/audio/Playback.tish:transportTick`) advances a
**16th-note `perfStep`**. Each tick: commit any queued Session scene on the bar line, prune stale
agent tracks, flush co-DJ blocks scheduled for this step, interpolate all automation at the current
beat, and fire the due step/notes. The loop is **self-scheduling** and reads `project.bpm` every tick,
so tempo changes take effect live. Generators are modular plugins
([GENERATORS.md](GENERATORS.md)) dispatched by `generatorId`:

| `generatorId` | TPL `gen` | sound |
|---------------|-----------|-------|
| `noiseBurst` | `noise_burst` | filtered-noise percussion (kick/snare/hat) |
| `fmTone` | `fm` | 2-operator FM + ADSR |
| `basicOsc` | `basic_osc` | single oscillator + ADSR |
| `matrixFm` | `matrix_fm` | Sytrus-style multi-operator graph via `gen_block` |

To add an instrument: drop a module in `src/generators/`, register it, branch in `Dispatch.tish`.
This is the only place sound is defined — there is no separate hand-written JS engine.

---

## 6. Co-DJ — agents and humans performing together

The collaboration layer (`src/codj/`) is the differentiator. A **session** is a room on the gateway;
**actors** (browsers `human-*`, agents `agent-*`/`actor-*`) join with an `actorId` and a declared
`skillIds` set.

- **Ownership / merge** (`Merge.tish`, `CoDjMeta.tish`): each channel id has an owner lane; an actor
  may only edit tracks it owns (or new tracks), and never a **master-locked** track. A per-track
  **LOCK/OPEN** toggle in the channel rack sets `masterLock`.
- **Skills** (`Skills.tish`): an actor's `skillIds` gate which lines it may emit. Master-scope lines
  (`bpm`, `auto`, `transpose`, `master_mix`, `actor_mix`, `session_*`, `clip`) require the
  `master_mixer` skill. The gateway stamps each sender's `skillIds` onto fan-out; the receiver
  enforces them on apply (disallowed lines are silently skipped). See [DJ_SKILLS.md](DJ_SKILLS.md).
- **Scheduling** (`Schedule.tish`): blocks target a **future** `perfStep` (`effectivePerfStep`,
  with `submitDeadlinePerfStep` / `asap`) so remote edits land on the bar instead of "now". The
  transport flushes them at the right step.
- **Overlays** (`Overlay.tish`): temporary, non-committing changes (e.g. a Web-MIDI note → channel
  gain) applied on the read path until cleared or promoted.
- **Pruning** (`Prune.tish`): agent-owned tracks untouched for a couple of sequences are removed, so
  an improvising agent doesn't accumulate clutter.

### The end-to-end happy path

```
agent worker                      gateway                         browser (host)
─────────────                     ───────                         ──────────────
join (skillIds)  ───────────────▶  room/presence  ◀─────────────  join (Connect)
                                                                   Play → stream project as tpl.line
buffer peer tpl.line  ◀────────── fanout (+skillIds) ◀──────────── tpl.line per line (throttled)
debounce → snapshot buffer
  → callLLM → TPL lines
tpl.stream_chunk (live tokens) ──▶ fanout ──────────────────────▶ "Hub → you" preview
tpl.block @ effectivePerfStep ───▶ fanout ──────────────────────▶ schedule → apply on that step
                                                                   merge (ownership/skills) → synth → sound
```

Humans stream **`tpl.line`** (decoded incrementally); agents commit **`tpl.block`** scheduled to a
future bar. The worker only collapses the rolling stream into a single prompt **at the LLM boundary**
— everything on the wire stays a stream. With no `GRADIENT_MODEL_ACCESS_KEY`, the worker falls back to
a built-in demo patch so the loop is exercisable offline.

---

## 7. The DAW UI

`src/ui/App.tish` is the orchestrator. It holds the project in `useState` and a mutable
**`DeckardRuntime`** bag (`DeckardRuntime.tish`) in a `useRef` for transport/Co-DJ/editor/WS state
(no `window.__*` globals). Workspace tabs:

- **Sequencer** — channel rack + step grid (`ChannelRack.tish`), piano roll (`PianoRoll.tish`,
  canvas), and the **Co-DJ** panel (`CoDjPanel.tish`: connect, stream previews, activity log).
- **Session** — Ableton-style scene launcher (`SessionView.tish`, model in `Session.tish`).
- **Patch** / **Instrument** — per-track generator editor (`InstrumentPanel.tish`,
  `GeneratorParams.tish`, `MatrixFmPanel.tish` for the matrix-FM graph).
- Always-docked **TPL editor** (`CodeDebugView.tish`) — Apply/Sync, step highlight, the
  emit-mirror of the project.

The mixer (`Mixer.tish`) renders the track → actor → master tiers; a master **scope** (`Scope.tish`)
draws the analyser. The rule (`.cursor/rules/tish-midi.mdc`): **business logic lives in
model/schedule/audio; UI files are layout + wiring.**

---

## 8. Services

| Service | File | Role |
|---------|------|------|
| **Gateway** | `services/gateway/main.tish` | One room per `sessionId`; JSON fan-out; per-actor `seq`; presence; stamps each sender's `skillIds` onto fan-out. `ws://127.0.0.1:35987` (or `CODJ_HUB_PORT`). |
| **Agent worker** | `services/agent-worker/main.tish` | Joins as an actor; buffers the peer stream; on debounce snapshots it into one prompt, calls the LLM, and streams real TPL out (`tpl.stream_chunk` → `tpl.block`); demo fallback without a key. |
| **Token-stream demo** | `services/token-stream-demo/main.tish` | A bot that streams rotating patches (kick / hats / bass) to prove the wire path end-to-end. |

Run order: **gateway → worker → browser** (`npm run gateway`, `npm run agent`, `npm run serve`).
See the [README](../README.md) quick-start.

---

## 9. Maturity map

| Area | State |
|------|-------|
| Project model, schema, v1→v2 migration | **Solid** |
| TPL parse / apply / emit round-trip (incl. step_pitch, mixer lines, sessions, gen_block) | **Solid** |
| Web Audio synthesis, 3-tier mixer, automation, deck routing | **Solid** |
| Session / scene launcher (arm / queue / commit) | **Solid** |
| Co-DJ gateway, ownership/merge, perf-step scheduling, overlays, pruning | **Solid** |
| Incremental `tpl.line` decode; skill-gating enforcement | **Wired** |
| Agent worker LLM call + real outbound streaming | **Wired** (needs `GRADIENT_MODEL_ACCESS_KEY`) |
| matrix_fm generator + graph editor | **Working** |
| **Planned / not yet built** | SQLite + vector/RAG agent memory; provider-side SSE token streaming (currently the finished reply is streamed char-by-char); control ops `take_track`/`release_track`/`set_master`/`master_overwrite`; named MIDI controller profiles (only note%8 → gain overlay exists); inline `@lane` author tags; Session-view scene authoring (add/remove/duplicate/clear). |

---

## 10. File index (start here)

- **Model:** [Project.tish](../src/model/Project.tish), [Session.tish](../src/model/Session.tish),
  [Edits.tish](../src/model/Edits.tish), [Migrate.tish](../src/model/Migrate.tish),
  [MixerRouting.tish](../src/model/MixerRouting.tish), [DeckRouting.tish](../src/model/DeckRouting.tish)
- **TPL:** [Parser.tish](../src/tpl/Parser.tish), [Apply.tish](../src/tpl/Apply.tish),
  [Emit.tish](../src/tpl/Emit.tish), [Stream.tish](../src/tpl/Stream.tish) (incremental),
  [TplExtension.tish](../src/tpl/TplExtension.tish)
- **Audio:** [Engine.tish](../src/audio/Engine.tish), [Playback.tish](../src/audio/Playback.tish),
  [schedule/Engine.tish](../src/schedule/Engine.tish), [generators/](../src/generators/)
- **Co-DJ:** [Merge.tish](../src/codj/Merge.tish), [Skills.tish](../src/codj/Skills.tish),
  [Schedule.tish](../src/codj/Schedule.tish), [Overlay.tish](../src/codj/Overlay.tish),
  [CoDjMeta.tish](../src/codj/CoDjMeta.tish), [Prune.tish](../src/codj/Prune.tish)
- **UI:** [App.tish](../src/ui/App.tish) (orchestrator), [CoDjPanel.tish](../src/ui/CoDjPanel.tish)
- **Services:** [gateway](../services/gateway/main.tish), [agent-worker](../services/agent-worker/main.tish)
- **Tests:** [test/smoke.tish](../test/smoke.tish) — `npm test` (round-trip, incremental decode,
  skill-gating, permissions)
