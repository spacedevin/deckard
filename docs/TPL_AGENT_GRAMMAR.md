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
  …generator lines…
  steps <16 x/. tokens> | steps euclid <hits> <steps>
  note <midi> <startBeat> <durBeats> v <0..1>   (repeat)
```

## Generators

| `gen` | Indented lines |
|-------|----------------|
| `noise_burst` | `noise attack decay tone pitch_follow` |
| `fm` | `fm ratio mod_index carrier sine\|square mod sine\|square` + `adsr a d s r` |
| `basic_osc` | `osc waveform sine\|square\|…` + `adsr a d s r` |

## Automation (optional)

- `auto master_gain` / `auto <channelId> gen <param>` with `  <beat> <value>` lines.

## Rules

- Use **lane-unique** track `id` (e.g. `ai-a_hat`).
- Prefer **euclid** or **steps** patterns that **complement** human density (space vs fill).
