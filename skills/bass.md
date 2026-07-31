---
id: bass
role: client
gates: add_track, adjust_instrument, pattern_steps, pattern_piano, channel_mix
weight: 1.3
---

# Bass

## Intent
Lay the low end that locks to the kick and sets the tune's genre, weight, and energy.

## How to think
- Bass IS the genre signal: a rolling sub808 = deep house/dub; an acid303 with moving cutoff = acid/techno; a reeseBass = DnB/dubstep. Pick the generator to imply the direction you want (as a client, this is how you steer — content, not master).
- Lock to the kick: leave the downbeat to the kick's transient and place bass in the gaps (offbeat `. x . x`, or sustained notes that duck around `x` kick hits). Don't fight the kick's fundamental.
- One bass voice at a time. If a bass already plays, don't double it — add a counter-melody an octave up, a stab, or texture instead. Two subs = mud.
- Stepped vs note: use `steps` + `step_pitch` for a one-note groove/rumble; use `note` lines for a moving root that follows the harmony (give the bass a tune, not just a pulse).
- Acid is movement: a static acid303 is dead. Sweep `fx cutoff` across bars and keep `res` high (0.6–0.85) for the squelch; add `step_prob`/`step_nudge` to make it breathe.
- Keep it mono and centered: `mix pan 0`, carve room with `eq_lo`, and don't reverb the sub. Set `voice octave -1` to drop it into sub range when a generator sits too high.

## deck it emits
- `track <Name> id <me>_bass gen acid303|sub808|reeseBass|bass_reese_punch|bass_reese_sc|bass_wobble`
- `steps` / `steps euclid <n> 16` + `step_pitch <midi>` (`bar <sel>` for per-bar root moves) — stepped groove
- `note <midi> <start> <dur> v <vel> [p r n]` — moving melodic bassline
- `step_vel|step_prob|step_ratchet|step_nudge` locks for groove/humanize
- `voice octave <-2..2>` to seat the register; `adsr a d s r` for note shape/length
- `fx cutoff <hz> res <0..1> drive <0..1> filter_type lowpass` — acid/reese filter movement
- `mix gain pan eq_lo eq_mid eq_hi` to sit it under the kick

## Examples
```tpl
deck 1
track Sub id <me>_bass gen sub808
  voice octave -1
  step_pitch 33
  steps x . . . x . . . x . . . x . x .
  step_vel 110 0 0 0 100 0 0 0 110 0 0 0 100 0 70 0
  mix gain 0.85 pan 0 eq_lo 2
```
```tpl
deck 1
track Acid id <me>_acid gen acid303 * 2
  step_pitch 28
  steps x . x x . x . x x . x . x x . x
  step_prob 1 0 0.8 1 0 0.9 0 1 1 0 0.7 0 1 1 0 0.6
  step_nudge 0 0 0.03 0 0 -0.02 0 0 0.04 0 0 0 0 0.02 0 0
  fx cutoff 380 res 0.8 drive 0.4 filter_type lowpass
  mix gain 0.7 pan 0
```
```tpl
deck 1
track Reese id <me>_reese gen reeseBass
  note 31 0 1.5 v 100
  note 31 2 1 v 95 n 0.02
  note 34 3 1 v 100 p 0.85
  adsr a 0.01 d 0.2 s 0.7 r 0.1
  fx cutoff 900 res 0.45 lfo_rate 0.5 lfo_depth 0.4
  mix gain 0.72 pan 0 eq_mid -1.5
```
