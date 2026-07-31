# deck grammar (co-DJ agent reference)

The lines a **co-DJ lane** may emit. Human/host stream lines are **read-only context**; you add **new tracks +
patterns on your own lane only** (ids prefixed with your `actorId`, e.g. `ai-a_hat`). This is the agent subset
of the full language — for the complete grammar (master-scope headers, clips, `gen_block` graphs, automation,
control directives) see **[DECK_GRAMMAR.md](DECK_GRAMMAR.md)** (canonical). Keep this in lockstep with the agent
`SYSTEM_PROMPT` in [`services/agent-worker/main.tish`](../services/agent-worker/main.tish) and the master-scope
denylist in [`src/codj/Skills.tish`](../src/codj/Skills.tish).

## Track block

```
track <DisplayName> id <lane_unique_id> gen <generator> [* <bars>]
  mix gain <0..1> pan <-1..1> [eq_lo <dB>] [eq_mid <dB>] [eq_hi <dB>] [mute 1] [solo 1]
  fx [cutoff <hz>] [res <0..1>] [drive <0..1>] [reverb_send <0..1>] [lfo_rate <hz>] [lfo_depth <0..1>] [filter_type <lowpass|highpass|bandpass|notch>]
  voice [octave <-2..2>] [chord <off|major|minor|min7|maj7|dom7|sus4|add9|dim|aug>] [arp <off|up|down|updown|random>] [arprate <auto|1/8|1/16|1/32>] [inversion <root|1st|2nd>] [strum <0..150>]
  …generator param lines (see below)…
  adsr a <s> d <s> s <0..1> r <s>          (generators with an envelope)
  step_pitch <midi>                         (base pitch for step hits; default 36; `bar <selector>` for per-bar)
  steps <16 x/. tokens>  |  steps euclid <hits> 16
  step_vel <16 ints 1-127>                  (per-step velocity lock — optional, emit only deviations)
  step_prob <16 floats 0-1>                 (per-step probability — seeded, deterministic across peers)
  step_ratchet <16 ints 1-8>                (per-step sub-hits)
  step_nudge <16 floats -0.5..0.5>          (per-step micro-timing, fraction of a step)
  note <midi> <startBeat> <durBeats> v <vel 0-127> [p <prob>] [r <ratchet>] [n <nudge>] [bar <sel>]   (repeat; melodic)
  loops <N|inf>                             (finite repetition cap for this channel)
```

Beats are **quarter-notes**: step `i` (0–15) = beat `i*0.25` in the looping bar. `* <bars>` on the header makes a
multi-bar pattern; `bar <selector>` (`even`/`odd`/`<n>`/`2n+1`/`0,2`) on `note`/`step_pitch` varies it per bar.

## Generators (`gen <id>`)

**Fixed generators** (33) — pick by role; don't default everything to `noise_burst`/`fm`:

| role | ids |
|------|-----|
| perc/hat | `drumSynth` (`drum`) · `clap` · `cymbal` · `noise_burst` |
| lead/synth | `basic_osc` (`osc`) · `fm` · `aether` · `syncLead` · `obSync` · `laserSync` |
| keys/mallet | `tine` · `halo` · `bell` |
| pad/texture | `pad` · `noise_burst` |
| strings | `guitar` · `arco` |
| chip | `chiptune` · `nes2a03` · `gameBoyDmg` · `c64sid` · `ym2612` · `sn76489` · `spc700` · `gbaDirectSound` |
| vocal | `formantVocal` · `ttsVocal` · `meSpeakVocal` · `syncChoir` |
| modular (advanced) | `matrixFm` · `patch` (use `gen_block … end gen_block`; prefer named generators) |

**Macro voices** (expand to a tuned patch; use the macro name directly as `gen <id>`):

| role | ids |
|------|-----|
| kick | `kick_edm` · `kick_deep` · `kick_distorted` |
| bass | `bass_reese_punch` · `bass_reese_sc` · `bass_wobble`  (plus the bass **generators** `acid303` · `sub808` · `reeseBass`) |

Generators vs. macros never share a label (see project memory *macro-generator-boundary-policy*). Only
`noise_burst`/`fm`/`basic_osc`/`matrix_fm`/`drum_synth`/`patch` have short aliases — every other id is used verbatim.

### Generator param lines

| `gen` | indented param line(s) |
|-------|------------------------|
| `noise_burst` | `noise attack <s> decay <s> tone <0..1> pitch_follow <0..1>` |
| `fm` | `fm ratio <n> mod_index <n> carrier <sine\|square> mod <sine\|square>` (+ `adsr`) |
| `basic_osc` | `osc waveform <sine\|square\|saw\|triangle>` (+ `adsr`) |
| every other named generator | `gen <param> <value> …` — 0–1 designer knobs (e.g. `gen tone 0.5 swell 0.45`) |
| `matrix_fm` / `patch` | `gen_block <patch\|matrix_fm> … end gen_block` graph — see [DECK_GRAMMAR.md](DECK_GRAMMAR.md) / [DECK_EXTENSION.md](DECK_EXTENSION.md) |

## What you may NOT emit (master-scope)

These change the **whole session for every player**, so they require the `master_mixer` skill and are **skipped**
for an agent lane (per [`Skills.tish`](../src/codj/Skills.tish)):

```
bpm   tpl   auto   transpose   scale   swing   master_mix   actor_mix
session_scenes   session_slot   clip   @ <control directives>
```

Also **never** emit `remove_track <id>` — deleting tracks is a host/UI action (owner-gated), not something an
agent does. You add complementary parts.

So **global key (`scale`) and groove (`swing`) are master-only** — you cannot re-key or re-shuffle the mix.
Live control directives (`@ launch`/`transport`/`cue`/`throw`/`fx`/`deck`) are a separate master/owner surface —
see [DECK_GRAMMAR.md § Control directives](DECK_GRAMMAR.md#control-directives--).

## Streaming

You may stream `deck.line` incrementally — each line decodes progressively (a track sounds the moment its
`track …` arrives; the pattern fills as `steps …`/`note …` stream). Lane-unique ids are required.

**Goal:** complement the project — add the parts that are missing (hats, perc, bass, chords, melody), match the
tempo, and leave space. Don't double what already plays.
