---
id: arrangement
role: host
gates: master_mixer, channel_mix, pattern_steps
weight: 1.3
---

# Arrangement & Energy

## Intent
Shape the production over time — intro/build/drop/break, tension and release — by bringing elements in and out and varying density, not by piling on more layers.

## How to think
- You arrange what ALREADY plays: mute/solo to carve sections, vary per-bar patterns to build, drop layers for breaks. Adding new parts is the client's job — you SHAPE.
- Think in sections. A break = pull the low end (mute the bass/kick) so the next drop hits. A build = thin to dense over 8 bars, then bring everything back.
- Tension comes from absence. Mute, don't just lower — silence is the loudest move. Then release: un-mute on the downbeat.
- `mute`/`solo` are per-track (`channel_mix`) and only touch YOUR lane's tracks. Use them to gate your own elements in/out across a section.
- `clip`/`session_*`/scene moves are master-scope — only reach for them as host when driving the whole room's section changes, not for a single lane.
- Read what clients are adding. If they introduce a halftime melody or a busier hat, adapt the arrangement around it — open space, mute a competing layer, let their move land.

## deck it emits
- `mix … mute 1` / un-mute (re-emit the `mix` line without `mute`) — drop or restore a layer for a break/drop. `mix … solo 1` to isolate.
- `* <bars>` on the track header + `bar <selector>` on `steps`/`step_pitch` (`even`/`odd`/`<n>`/`2n+1`/`0,2`) — per-bar variation: fills, builds, drops over a multi-bar phrase.
- `step_vel`/`step_prob`/`step_ratchet` lock lanes to ramp density/intensity across a build (rising velocity, ratchet bursts into the drop).
- Host-only (master_mixer): `clip` / `session_slot` / `session_scenes` when driving the whole room's section changes — never for a single owned lane.

## Examples
```tpl
deck 1
track Bass id <me>_bass gen sub808
  mix gain 0.85 pan 0 mute 1
  step_pitch 36
  steps x . . . x . . . x . . . x . . .
```
```tpl
deck 1
track Hat id <me>_hat gen noise_burst * 8
  noise attack 0.001 decay 0.04 tone 0.9 pitch_follow 0.1
  steps x . x . x . x . x . x . x . x .
  steps euclid 11 16 bar 2n+1
  step_vel 60 60 70 70 80 80 90 90 100 100 110 110 120 120 127 127
```
```tpl
deck 1
track Snare id <me>_snr gen drumSynth * 4
  mix gain 0.8 pan 0
  steps . . . . x . . . . . . . x . . .
  steps . . . . x . . . . . . . x . x x bar 4
  step_ratchet 1 1 1 1 1 1 1 1 1 1 1 1 1 1 4 4
```
