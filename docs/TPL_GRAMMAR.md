# TPL — Tish Patch Language

Streamable, line-oriented patch text for **tish-midi** projects. Optimized for incremental parse (one completed line at a time) and LLM token streams.

## UI: Song vs Stream

| View | Purpose |
|------|---------|
| **Song** | Full static patch: one document, Apply / Sync, step highlighting during playback. |
| **Stream** | Real-time token flow: **Live** holds the partial tail; each **newline** commits completed lines into a short **reference** buffer (last ~24 lines, older lines fade). Use **Promote to song** to append reference + live into the Song buffer. |

**Programmatic stream feed** (e.g. LLM chunking by line):

- `window.__tplStreamAppendLine("track kick id c0 gen noise_burst")`
- `window.__tplStreamClearRef()` — clear reference
- After switching to Stream tab once, `window.__tplStreamLive` is the live `<textarea>` if you need to inject text.

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

## Track block

```
track <displayName> id <channelId> gen <generatorId>
  ...
```

- **generatorId** (TPL): `noise_burst`, `fm`, `basic_osc`, `fm_tone` → internal `noiseBurst`, `fmTone`, `basicOsc`.
- Indented lines (2+ spaces or tab) belong to this track until the next top-level statement (`track`, `auto`, `bpm`, `tpl`).

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

Multiple `note` lines append in order of appearance. Re-applying a full track block that contains `note` lines **replaces** all notes for that channel (see streaming note below).

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

Body is stored under `channel.generatorSpec` (e.g. `raw` array of lines) until a **TplExtension** parser exists for that id. Extensibility for slicer-style graphs.

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
| Repeat / rate | `repeat 2`, `slow 2` / `fast 2` |
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
