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
track <displayName> id <channelId> gen <generatorId> [ * <N|inf|infinite> ]
  ...
```

- **generatorId** (TPL): `noise_burst`, `fm`, `basic_osc`, `fm_tone`, `matrix_fm` → internal `noiseBurst`, `fmTone`, `basicOsc`, `matrixFm`.
- Indented lines (2+ spaces or tab) belong to this track until the next top-level statement (`track`, `auto`, `bpm`, `tpl`).

### Loop / repeat (bar cap)

- **One loop** = **one bar** = **16 transport steps** (the same grid as the step sequencer and `globalStep % 16`).
- **Default:** if you omit `*` and any `loops` line, the track repeats **forever** (current behavior).
- **Finite:** `* 4` on the track header or an indented line `loops 4` means: after **4 complete bars** have elapsed since **Play** (or since this track block was last applied for that `id`), the track **stops sounding** until the next Play or until the same `id` is applied again (counter resets).
- **Infinite (explicit):** `* inf`, `* infinite`, or `loops inf` / `loops infinite`.
- **Precedence:** if both header `*` and body `loops` appear, **`loops` in the body wins** (last author wins for that block).
- **Apply / Sync:** when the project is emitted back into the editor, a finite cap is written as **` * N` on the `track` line** (not a separate `loops` line), so the header form is preserved.

Example:

```
track Fill id c9 gen noise_burst * 2
  mix gain 0.8
  noise decay 0.08 tone 0.4 pitch_follow 0.2
  steps x x x x x x x x x x x x x x x x
```

After two bars, that channel is silent for scheduling (mixer mute is unchanged). Re-sending a `track … id c9 …` block resets the bar counter and `tplLoopBars` for `c9`.

### Mix

```
mix gain 0.9 pan 0
mix mute 1
mix solo 1
```

`mute` / `solo`: `1` / `true` / `on` vs `0` / `false` / `off`.

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
note <midi> <startBeat> <durBeats> v <velocity>
```

- **Beats** are in **quarter-note units** (1 beat = one quarter note). The **piano roll** shows **one bar only** (4 beats) and snaps to a **zoom-dependent grid** (wheel or **±**): from **1 beat** down to **1/128 beat**.
- **Single-bar rule:** every note must lie in the **first bar**: `0 <= startBeat < 4` and `startBeat + durBeats <= 4`. Apply rejects the line with an error if not satisfied (streaming stays strict).
- **DurBeats** is note length in the same units. New piano notes use duration **4× current snap**, capped so the note stays inside the bar.

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

## Streaming rules

1. Strip comments; ignore empty lines.
2. A line is **committable** when the newline is seen and any open block (`gen_block`) is properly closed.
3. Partial last line: show error, do not mutate project.
4. **Incremental apply:** for each completed top-level `track` block (or full program), merge into project by `channelId`.

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

## Golden example

```
tpl 1
bpm 118

track Kick id c0 gen noise_burst
  mix gain 0.9 pan 0
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
