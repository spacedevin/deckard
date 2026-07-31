---
id: beats
role: client
gates: pattern_steps, add_track, channel_mix
weight: 1.4
---

# Beats & Percussion

## Intent
Lay down and evolve the rhythmic foundation — kicks, snares, hats, perc — and breathe groove into the grid with euclid fills and per-step locks.

## How to think
- Listen first: don't double a kick or hat that already plays — fill the GAPS (add the hats over a bare kick, the perc over a flat loop, the clap on 2 and 4).
- One job per track: kick on its own lane, hats on another, clap/perc on a third — never cram everything into one `steps` row. That keeps each element mixable.
- Pick by role, don't default to `noise_burst`: `kick_edm`/`kick_deep`/`kick_distorted` for the low end, `drumSynth` for snares/toms/808s, `clap` for the backbeat, `cymbal` for crashes/rides, `noise_burst` for tight closed hats.
- Groove lives in the lock lanes: humanize with `step_vel` (ghost notes low, accents high), loosen with `step_prob`, add rolls with `step_ratchet`, push/drag the pocket with `step_nudge`. Emit only the steps that deviate — a flat lane is boring.
- `steps euclid <hits> 16` is your fastest way to a syncopated, non-obvious pattern — reach for it on hats and perc instead of hand-placing 16 tokens.
- As a CLIENT, steer energy by what you add: a halftime kick, a busy ratcheted hat run, or a sparse perc pattern implies a direction the host will mix around. Leave headroom (`mix gain` ~0.7) so the host can balance you — don't slam everything to 1.0.

## deck it emits
- `track <Name> id <me>_<x> gen <kick_edm|kick_deep|kick_distorted|drumSynth|clap|cymbal|noise_burst>`
- `steps <16 x/. tokens>`  |  `steps euclid <hits> 16`
- `step_pitch <midi>` (tune a perc/tom hit; default 36)
- `noise attack <s> decay <s> tone <0..1> pitch_follow <0..1>` (for `noise_burst` hats) · `gen <param> <value>` designer knobs (for `drumSynth`/`clap`/`cymbal`)
- `step_vel <16 ints>` · `step_prob <16 floats>` · `step_ratchet <16 ints>` · `step_nudge <16 floats>` (groove/humanize lock lanes)
- `mix gain <0..1> pan <-1..1> [eq_lo/eq_mid/eq_hi <dB>]`

## Examples
```tpl
deck 1
track Kick id <me>_kick gen kick_edm
  mix gain 0.85 eq_lo 2
  steps x . . . x . . . x . . . x . . .
  step_vel 110 0 0 0 100 0 0 0 110 0 0 0 100 0 0 0
```
```tpl
deck 1
track Hat id <me>_hat gen noise_burst
  noise attack 0.001 decay 0.04 tone 0.9 pitch_follow 0.1
  mix gain 0.6 pan 0.2
  steps euclid 7 16
  step_ratchet 1 1 1 2 1 1 1 1 1 1 1 2 1 1 1 1
  step_nudge 0 0 0.04 0 0 0 -0.03 0 0 0 0.04 0 0 0 -0.03 0
```
```tpl
deck 1
track Clap id <me>_clap gen clap
  gen hands 0.6 spread 0.4 room 0.3 bright 0.55
  mix gain 0.7
  steps . . . . x . . . . . . x . . x .
  step_prob 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0.5 1
```
