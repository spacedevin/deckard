# TPL grammar (agent reference)

Human stream lines are **read-only context**. You emit **new** tracks/patterns on **your lane** only (`ai-a` ids).

## Structure

- `tpl 1` — document header (usually one block).
- `bpm 120` — tempo.
- Blank line between tracks.

## Track block

```
track <DisplayName> id <unique_id> gen <generator>
  mix gain <0..1> pan <-1..1> [mute 1] [solo 1]
  step_pitch <midi>   (base MIDI pitch for step hits when no piano notes; default 36)
  …generator lines…
  steps <16 x/. tokens> | steps euclid <hits> <steps>
  step_vel <16 ints 1-127>      (optional per-step velocity lock)
  step_prob <16 floats 0-1>     (optional per-step probability — seeded, deterministic across peers)
  step_ratchet <16 ints 1-8>    (optional per-step sub-hits)
  step_nudge <16 floats -0.5..0.5>  (optional per-step micro-timing, fraction of a step)
  note <midi> <startBeat> <durBeats> v <velocity 0-127, default 100> [p <prob 0-1>] [r <ratchet 1-8>] [n <nudge -0.5..0.5>]   (repeat)
```

Notes carry the same four locks as steps (per-note `p`/`r`/`n`, emitted only when non-default). See [TPL_GRAMMAR.md § Notes](TPL_GRAMMAR.md#notes-piano-roll).

Per-step locks ride parallel lanes after `steps` (emit only when a step deviates from default). See [TPL_GRAMMAR.md § Per-step parameter locks](TPL_GRAMMAR.md#per-step-parameter-locks).

## Generators

| `gen` | Indented lines |
|-------|----------------|
| `noise_burst` | `noise attack decay tone pitch_follow` |
| `fm` | `fm ratio mod_index carrier sine\|square mod sine\|square` + `adsr a d s r` |
| `basic_osc` | `osc waveform sine\|square\|…` + `adsr a d s r` |
| `matrix_fm` | `gen_block matrix_fm … end gen_block` graph (see [TPL_GRAMMAR.md](TPL_GRAMMAR.md) / [TPL_EXTENSION.md](TPL_EXTENSION.md)) |
| `patch` | the universal modular voice: `gen_block patch … end gen_block` with `osc`/`noise`/`string`/`filter`/`shaper`/`pan`/`gain` nodes, `conn` wiring, breakpoint `env` (expressions incl. `note*vel`, `max()`/`min()`). See [TPL_GRAMMAR.md](TPL_GRAMMAR.md). |
| named voices (`aether`, `formantVocal`, `ttsVocal`, `guitar`, `tine`, `halo`, `arco`, `clap`, `pad`, `bell`, `drum_synth`) | `gen <param> <value> …` (0–1 designer params; e.g. `gen tone 0.5 swell 0.45`) |

Live **control directives** (`@ launch`/`transport`/`cue`/`throw`/`fx`/`deck`) are a separate transient surface — see [TPL_GRAMMAR.md § Control directives](TPL_GRAMMAR.md#control-directives--).

## Automation (optional)

- `auto master_gain` / `auto <channelId> gen <param>` with `  <beat> <value>` lines.

## Rules

- Use **lane-unique** track `id` (e.g. `ai-a_hat`).
- Prefer **euclid** or **steps** patterns that **complement** human density (space vs fill).
- You may **stream `tpl.line`** incrementally — each line is decoded progressively (a track sounds the moment its `track …` arrives, the pattern fills as `steps …` streams). **Master-scope lines** (`bpm`, `swing`, `scale`, `auto`, `transpose`, `master_mix`, `actor_mix`, `clip`, `session_*`) require the **`master_mixer`** skill and are **skipped** for agent lanes lacking it.
- `scale <root> <mode>` / `scale off` — global key constraint (folds every melodic pitch onto the scale, live). See [TPL_GRAMMAR.md § Global](TPL_GRAMMAR.md#global).
