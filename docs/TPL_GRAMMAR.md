# TPL — Tish Patch Language

Streamable, line-oriented patch text for **Deckard** projects. Optimized for incremental parse (one completed line at a time) and LLM token streams.

## UI: local song vs hub stream

There is a **single** TPL editor (Apply / Sync, step highlight). **Stream vs local** is tied to **Co-DJ**:

| State | TPL panel |
|-------|-----------|
| **Not connected** | Banner: *Local — not on hub.* Edit the song locally. |
| **Co-DJ connected** | Banner: **Hub** + **Local → hub** preview (what you send on Play) and **Remote** (agent `tpl.stream_chunk` tail). |

**Append a line from JS** (e.g. LLM tooling wired to the app): call `streamAppendLine` on the `DeckardRuntime` object held in `App`’s `useRef` (`src/ui/DeckardRuntime.tish`). The TPL panel assigns it when the mirror textarea mounts — e.g. `runtime.streamAppendLine("track kick id c0 gen noise_burst")` appends a newline-terminated line to the live editor state.

## Version header

```
tpl 1
```

Must appear before track-specific lines (recommended first non-comment line).

## Comments

`#` starts a comment to end of line.

## Global

| Line | Effect |
|------|--------|
| `bpm <number>` | Project tempo (40–300). |
| `@ perf_step <n>` | **Stream / Co-DJ only**: schedule this patch for host perf step `n` (16th-note index). Ignored by Song parser except as no-op. JSON `effectivePerfStep` on `tpl.block` overrides this line. |

## Track block

```
track <displayName> id <channelId> gen <generatorId|macro> [ * <N> ] [ <param> <val> … ]
  ...
```

- **generatorId** (TPL): `noise_burst`, `fm`, `basic_osc`, `fm_tone`, `matrix_fm`, `patch` → internal `noiseBurst`, `fmTone`, `basicOsc`, `matrixFm`, `patch`. The id may instead be a **macro** name (built-in or user-defined) — see [Macros](#macros).
- Trailing `key value` pairs after the gen id (and the optional `* N`) are **macro parameter overrides** (ignored for plain generators).
- Indented lines (2+ spaces or tab) belong to this track until the next top-level statement (`track`, `macro`, `auto`, `bpm`, `tpl`).

### Pattern length (`* N`) vs loop cap (`loops N`)

These are **two independent things** — don't confuse them:

- **`* N` on the track header = pattern LENGTH in bars.** The channel's pattern spans `N` bars (its loop span is `N × 16` steps) and **repeats forever**. Notes can live on any bar (`0 ≤ startBeat < N×4`), `step_pitch` can vary per bar, and the sequencer shows an `N`-bar pager. Default (no `*`) = 1 bar. One bar = 16 transport steps.
- **`loops N` (indented body line) = finite play CAP.** After `N` complete bars since **Play** (or since this `id` was last applied), the track **stops sounding** until the next Play / re-apply (counter resets). `loops inf` / `loops infinite` = no cap (the default).

They compose: `* 4` + `loops 8` = a 4-bar pattern that plays twice, then stops. **Channels may have different `* N`** — drums can be 1-bar while a chord is 4-bar; each loops at its own length, polyrhythmically aligned.

Example — a 4-bar pattern (loops forever):

```
track Chord id c3 gen patch * 4
  note 48 0 16 v 90        # one held note spanning all 4 bars
```

Emitted back, the length is written as ` * N` on the `track` line; a cap (if any) as a separate `loops N` line.

### Mix

```
mix gain 0.9 pan 0
mix mute 1
mix solo 1
```

`mute` / `solo`: `1` / `true` / `on` vs `0` / `false` / `off`.

### Step pitch

```
step_pitch <midi> [ bar <selector> ]
```

Base MIDI pitch used for step-sequencer hits when the channel has **no** piano notes (default **36**). Has no effect on a channel driven by `note` lines. On Apply / Sync the line is emitted only when it differs from the default `36`.

**Per-bar pitch (multi-bar patterns):** add `bar <selector>` (see [Bar selectors](#bar-selectors)) and supply one `step_pitch` line per bar/group — the active one for the current loop bar sets the pitch. Lets a stepped bass roll change root each bar without changing its rhythm:

```
track Bass id c2 gen bass_acid * 4
  step_pitch 36 bar 0
  step_pitch 31 bar 1
  step_pitch 32 bar 2,3
  steps . x x x . x x x . x x x . x x x
```

### Steps (16-step row)

Literal:

```
steps x . . . x . . . x . . . x . . .
```

`x`, `X`, `1` = on; `.`, `0` = off. Optional velocity per step (future): `step 3 v 90`.

Euclidean (fills 16 steps):

```
steps euclid <hits> <len>
```

Example: `steps euclid 5 16` — five hits distributed across 16 steps.

### Notes (piano roll)

```
note <midi> <startBeat> <durBeats> v <velocity> [ bar <selector> ]
```

- **Beats** are in **quarter-note units** (1 beat = one quarter note). The sequencer shows **one bar at a time** with a bar pager for multi-bar patterns.
- **Range:** `0 ≤ startBeat` and `startBeat + durBeats ≤ bars × 4`, where `bars` is the track's `* N` length (default 1). Apply rejects out-of-range lines.
- **`bar <selector>` (sugar):** keep `startBeat` within one bar (`< 4`) and add a [bar selector](#bar-selectors); the note is **repeated on every matching loop bar** (expanded to `startBeat + bar×4`). Great for per-bar progressions:

```
track Chord id c3 gen patch * 4
  note 48 0 4 v 90 bar 0,2      # Cmin on bars 0 and 2
  note 43 0 4 v 90 bar 1,3      # Gmin on bars 1 and 3
```

- **DurBeats** is note length in the same units. New piano notes use duration **4× current snap**.

Multiple `note` lines append in order of appearance. Re-applying a full track block that contains `note` lines **replaces** all notes for that channel (see streaming note below).

**Steps vs piano roll (per channel):** use one or the other. If a track block includes any `note` lines, step data for that channel is cleared on Apply. If the block includes a `steps` line and **no** `note` lines, piano notes for that channel are cleared. Playback uses **only** piano notes when the channel has at least one note; otherwise the 16-step row drives hits.

### Transpose (bulk)

```
transpose <semitones>
```

Shifts every `note` pitch on this channel by integer semitones (e.g. `transpose -2`). Apply after notes are collected for that block, or run on existing notes when only `transpose` appears.

### Generator params

**Noise burst**

```
noise attack 0.002 decay 0.12 tone 0.15 pitch_follow 0.35
```

**FM**

```
fm ratio 1 mod_index 6 carrier sine mod sine
adsr a 0.008 d 0.12 s 0.35 r 0.15
```

**Basic OSC**

```
osc waveform sine
adsr a 0.005 d 0.08 s 0.4 r 0.12
```

Snake_case in TPL maps to camelCase in `generatorParams` (`pitch_follow` → `pitchFollow`, `mod_index` → `modIndex`).

### Heavy generators (`gen_block`)

```
gen_block <generatorId>
  ... arbitrary lines until end ...
end gen_block
```

Body is stored under `channel.generatorSpec` (`raw` array of lines). For **`matrix_fm`**, the same block is parsed into `generatorSpec.graph` (operators, `mod` matrix, `filter`, `route`). Use `track … gen matrix_fm` plus:

```
gen_block matrix_fm
  op 1 wave sine ratio 0.5
  op 2 wave saw ratio 1.0
  env op 1 a 0.01 d 0.5 s 0.8 r 0.1
  mod fm 2 1 4.0
  mod rm 3 2 1.0
  filter 1 type lp24 cutoff 400 res 0.6
  env filter 1 a 0.1 d 0.4 s 0.1 r 0.2 amount 2000
  route op 1 filter 1 1.0
  route op 4 out 0.2
  route filter 1 out 1.0
end gen_block
```

See [`docs/TPL_EXTENSION.md`](TPL_EXTENSION.md) and [`docs/GENERATORS.md`](GENERATORS.md).

### Patch (`gen_block patch`) — the modular synth voice

`gen patch` + a `gen_block patch` is the **universal voice**: a small modular graph (oscillators, noise, filters, waveshapers, gains) wired by `conn` lines, with breakpoint envelopes on any AudioParam. Anything a fixed generator does, a patch can express — it's how the deck-set instruments are built. Interpreter: [`src/generators/Patch.tish`](../src/generators/Patch.tish).

```
track Kick id k gen patch
  gen_block patch
    osc o sine                       # osc <id> <wave> [note|<hz>] [ratio R] [detune cents]
    gain a                           # gain <id> [value]
    conn o a                         # conn <src> <dst>
    conn a out                       #   dst: another node, a node param (a.gain / f.freq / o.detune / f.q),
    env o.freq set 0 150 exp 0.5 0.01#   `out` (→ channel, ×velocity), or `reverb` (→ channel reverb send)
    env a.gain set 0 1 exp 0.5 0.01  # env <node>.<param> <seg> <seg> …  seg = set|lin|exp <t> <v>
    dur 0.6                          # fixed voice duration (else the note/step length is used)
  end gen_block
  step_pitch 36
  steps x . . . x . . . x . . . x . . .
```

Node types: `osc`, `noise`, `filter <id> <type> [q Q] [freq Hz]`, `shaper <id> [amount A]`, `gain`.
Envelope **time/value expressions** resolve per-trigger: a number, `note` (Hz of the played note), `note*2`/`note/2`, `dur`, `dur-0.1`/`dur*0.5`, `vel` (0–1). Velocity also scales the `out` connection automatically.

### Bar selectors

A CSS-`nth`-style predicate for **which loop repetition (bar)** a `note` or `step_pitch` applies to. Bars are 0-indexed within the track's `* N` length. Single token, no spaces:

| Selector | Matches bars |
|---|---|
| `even` / `odd` | 0,2,4,… / 1,3,5,… |
| `<int>` (e.g. `2`) | only that bar |
| `n` / `*` / `all` | every bar |
| `<a>n` (e.g. `2n`) | `bar % a == 0` |
| `<a>n+<b>` (e.g. `3n+1`) | `bar % a == b` |
| `-n+<b>` (e.g. `-n+3`) | first `b` bars (0…b-1) |
| `<b0>,<b1>,…` (e.g. `0,2,5`) | explicit list |

### Macros

A **macro** is a named, parameterized **patch template**. Built-ins port the deck.tsx voices; you can define your own. A `gen <name> [overrides]` reference expands to a `gen_block patch` at load (so there's one synth engine), and round-trips back as the concise `gen <name>` line (not the expanded graph). Registry + expander: [`src/tpl/Macros.tish`](../src/tpl/Macros.tish).

**Define** (top-level; `key=default` params; `$name` substituted in the body):

```
macro my_zap top=4000 q=18
  osc o sawtooth note
  filter f lowpass q $q
  gain a
  conn o f
  conn f a
  conn a out
  env f.freq set 0 $top exp 0.2 100
  env a.gain set 0 0.3 lin dur 0.01
end macro
```

**Use** (overrides are `key value` after the gen id; compose with `* N`):

```
track Lead id l gen my_zap top 5000
  note 60 0 0.5 v 90
track Kick id k gen kick_edm                 # built-in, defaults
  steps x . . . x . . . x . . . x . . .
track Bass id b gen bass_acid * 4 q 9 top 2600
  step_pitch 36
  steps x . x . x . x . x . x . x . x .
```

Built-in macros: `kick_edm`, `kick_deep`, `kick_distorted`, `bass_reese`, `bass_reese_punch`, `bass_reese_sc`, `bass_acid` (`q`/`top`/`level`), `bass_wobble` (`lfo`).

## Automation

### Master gain

```
auto master_gain
  <beat> <value>
  ...
```

Maps to `project.automation.masterGain` (sorted by beat).

### Per-channel generator parameter

```
auto <channelId> gen <paramName>
  <beat> <value>
  ...
```

Stored in `project.paramAutomations[]`. At playback, values are interpolated by **beat** (`beat = globalStep * 0.25` per step tick) and merged into `generatorParams` for that channel when a note fires.

### Mixer (track / actor / master)

Interpolated every transport tick into the Web Audio mixer (same beat timeline as `master_gain`).

**Track** — `gain` (fader), `pan`, `eq_lo`, `eq_mid`, `eq_hi` (dB, same as static `mix` line):

```
auto <channelId> mix <gain|pan|eq_lo|eq_mid|eq_hi>
  <beat> <value>
  ...
```

**Actor bus** (lane id, e.g. `local`) — trim is `gain` or alias `trim`:

```
auto actor <lane> mix <gain|trim|eq_lo|eq_mid|eq_hi>
  <beat> <value>
  ...
```

**Master** — output EQ only (output level stays `auto master_gain`):

```
auto master mix <eq_lo|eq_mid|eq_hi>
  <beat> <value>
  ...
```

Stored in `project.mixerAutomations[]`. Applying TPL merges lanes by target + id + param (same pattern as `gen` automations: lanes present in the patch replace previous ones for that key).

## Static mixer lines

Top-level, non-automated counterparts to the `auto master mix` / `auto actor … mix` blocks. They set a single fixed value (no beat timeline) for the master bus and per-actor buses.

**Master** — output EQ (dB):

```
master_mix eq_lo <db> eq_mid <db> eq_hi <db>
```

Merges into `project.masterMixer` (`eqLo` / `eqMid` / `eqHi`). Keys may appear in any order; missing keys are left unchanged.

**Actor bus** (lane id, e.g. `local`):

```
actor_mix <lane> gain <n> eq_lo <db> eq_mid <db> eq_hi <db> [mute 1] [solo 1]
```

Merges into `project.actorMixer[<lane>]` (`gain` / `eqLo` / `eqMid` / `eqHi` / `mute` / `solo`). `gain` may be written as the alias `trim`. `mute` / `solo` are booleans (`1` / `0`). The static line is the non-automation counterpart to `auto actor <lane> mix …`.

## Session / scenes

Session-view clip launching maps to top-level lines plus `clip` blocks.

**Scene count:**

```
session_scenes <n>
```

Sets `project.session.sceneCount` (`n >= 1`).

**Slot assignment** — place a clip in a channel's row at a scene index (0-based):

```
session_slot <channelId> <sceneIdx> <clipId|->
```

`-` (or `.`) clears the slot. Writes `project.session.slots[<channelRow>][<sceneIdx>]`.

**Clip block** — a multi-bar pattern owned by a channel:

```
clip <clipId> channel <channelId> bars <n> [name <name>]
  ...
```

- `bars` must be `>= 1`. The clip's step grid is `bars * 16` steps.
- Indented body lines: `steps …` (literal or `euclid`), `note <midi> <startBeat> <durBeats> v <velocity>`, and `loops <N|inf>`. As with track blocks, a clip uses **either** steps **or** piano notes — `note` lines clear the clip's steps.
- Clip notes may span the whole clip (`0 <= startBeat`, `startBeat + durBeats <= bars*4` beats), not just the first bar.
- Stored on the owning channel under `channel.sessionClips[]`; merged by `clipId`.

## Streaming rules

1. Strip comments; ignore empty lines.
2. A line is **committable** when the newline is seen and any open block (`gen_block`) is properly closed.
3. Partial last line: show error, do not mutate project.
4. **Incremental apply:** for each completed top-level `track` block (or full program), merge into project by `channelId`.

### Streaming apply (line-by-line)

`tpl.line` is decoded **incrementally**, one completed line at a time (`src/tpl/Stream.tish`), as the streaming counterpart to the atomic `tpl.block` path — both coexist. A non-indented block opener (`track`, `clip`, `auto`) opens a block and re-applies as indented body lines stream in, so a track sounds the moment its `track …` line arrives and the pattern fills as `steps …` follows. Standalone top-level lines (`bpm`, `master_mix`, `actor_mix`, `session_scenes`, `session_slot`) apply on arrival. Every streamed line is skill-gated via `coDjLineAllowedForSkills`.

## FL Studio mapping (mental model)

| TPL | FL-ish concept |
|-----|------------------|
| `track` … `gen` | Channel rack instrument |
| `steps` | Step sequencer pattern |
| `note` | Piano roll |
| `mix` | Mixer strip |
| `auto` … `gen` | Plugin parameter automation |
| `auto` … `mix` | Mixer automation (track / `actor` lane / `master` EQ) |
| `gen_block` | Complex plugin internal graph (future) |

## Strudel / Sonic Pi roadmap (syntax hooks)

Documented for future grammar; not all are implemented in Apply v1.

| Feature | Planned TPL shape |
|---------|-------------------|
| Euclidean steps | `steps euclid k n` (implemented when n=16) |
| Named patterns | `pattern <id>` / `steps @id` |
| Swing / humanize | `swing 0.12`, `humanize ms 8` |
| Polymeter | `pattern_len 12` |
| Key / scale | `key E minor`, degree-based edits |
| FX blocks | `fx reverb … end fx` |
| Repeat / rate | Bar caps: `* N` / `loops N` (implemented); `repeat 2`, `slow 2` / `fast 2` (future) |
| Rings | `vel_cycle 80 72 90` |
| Sync / launch | `sync_bar` |
| MIDI / OSC | `midi_out …`, `osc …` |

## Not in core TPL

- Sleep-based timeline as primary model (project stays beat-indexed).
- Mandatory full Strudel mini-notation.
- Embedded scripting (Ruby/JS) inside patch text.
- **Deck routing** (per-channel `channel.deck` = `live` / `local` and `project.transportMainDeck`) is JSON/UI-only state — it is **not** parsed or emitted by TPL (`src/model/DeckRouting.tish`, `src/model/Project.tish`).

## Golden example

```
tpl 1
bpm 118

track Kick id c0 gen noise_burst
  mix gain 0.9 pan 0
  step_pitch 36
  noise decay 0.12 tone 0.15 pitch_follow 0.35
  steps x . . . x . . . x . . . x . . .

track Bass id c3 gen fm
  mix gain 0.85
  fm ratio 1 mod_index 6 carrier sine mod sine
  adsr a 0.008 d 0.12 s 0.35 r 0.15
  note 48 0.0 0.5 v 90
  note 50 1.0 0.5 v 85

auto master_gain
  0 1.0
  16 0.8

auto c0 gen decay
  0 0.12
  8 0.06
```
