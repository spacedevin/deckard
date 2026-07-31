---
id: groove-humanize
role: any
gates: channel_mix, pattern_steps
weight: 1.2
---

# Groove & Humanize

## Intent
Make parts that already play feel human and pocketed — velocity dynamics, probabilistic variation, ratchet rolls, and micro-timing nudge — without adding a single new voice.

## How to think
- Reach for this AFTER a part exists and sounds stiff or mechanical, not before — it's a finishing pass on your own lanes, layered over `steps`/`note`.
- Real swing is master-only (`swing`), so you can't re-shuffle the mix. IMPLY swing by nudging the off-beat (even-index) hits LATE with `step_nudge` (+0.05..+0.15) — that's your only handle on feel.
- Dynamics carry groove: accent the downbeat, ghost the in-between hits. Emit `step_vel` only where it deviates from a flat hit (accents ~110-127, ghosts ~30-60); a flat lane needs no lock.
- Use `step_prob` to keep a loop alive — drop fills/hats to ~0.6-0.85 so they thin out and vary; it's seeded, so every peer hears the SAME variation. Keep the structural backbone (kick downbeats) at 1.0.
- `step_ratchet` adds rolls/flams — reserve it for tension (a 2-3x ratchet on the last step before a turnaround); ratcheting everything turns a groove to mush.
- Groove is how a production locks together: match the host's implied feel, pocket your part against what's already playing, and leave the strong beats clean so the kick/bass read.

## deck it emits
- `step_vel <16 ints 1-127>` — per-step velocity accents/ghosts (channel_mix), parallel to an existing `steps` lane.
- `step_prob <16 floats 0-1>` — seeded per-step probability for living variation (channel_mix).
- `step_ratchet <16 ints 1-8>` — per-step sub-hit rolls/flams (channel_mix).
- `step_nudge <16 floats -0.5..0.5>` — micro-timing as a fraction of a step; the swing-feel handle (channel_mix).
- `note <midi> <start> <dur> v <vel> [p <prob>] [r <ratchet>] [n <nudge>]` — the same four locks inline on melodic notes (pattern_piano).

## Examples
```tpl
deck 1
track Hat id <me>_hat gen noise_burst
  noise attack 0.001 decay 0.04 tone 0.9 pitch_follow 0.1
  steps x x x x x x x x x x x x x x x x
  step_vel 120 48 90 48 110 48 90 60 120 48 90 48 110 48 90 70
  step_prob 1 0.7 0.9 0.6 1 0.7 0.9 0.65 1 0.7 0.9 0.6 1 0.7 0.85 0.8
  step_nudge 0 0.1 0 0.1 0 0.1 0 0.1 0 0.1 0 0.1 0 0.1 0 0.1
```
```tpl
deck 1
track Snare id <me>_snare gen drumSynth
  steps . . . . x . . . . . . . x . . x
  step_vel 1 1 1 1 118 1 1 1 1 1 1 1 118 1 1 90
  step_ratchet 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 3
```
```tpl
deck 1
track Pluck id <me>_pluck gen tine
  note 60 0 0.5 v 112 p 1 n 0
  note 64 0.5 0.5 v 70 p 0.8 n 0.08
  note 67 1 0.5 v 96 p 0.9 r 2 n 0
```
