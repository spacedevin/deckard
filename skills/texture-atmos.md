---
id: texture-atmos
role: client
gates: add_track, adjust_instrument, channel_mix
weight: 1.0
---

# Texture & Atmosphere

## Intent
Add the glue layer — drones, pads, risers, noise beds, reverb-soaked space — that sits low and wide under everything and gives the mix depth.

## How to think
- Reach for this when the production feels flat, dry, or two-dimensional — pads/drones fill the harmonic space between bass and lead without competing for the beat.
- Sit LOW in the mix (`gain 0.2..0.4`) and WIDE (reverb + pan); texture is felt, not heard up front. Never let it mask the kick, lead, or vocal.
- Long over busy: sustained `note` chords or sparse `steps`, slow attack/release so it swells instead of stabbing. Reverb (`reverb_send`) and filter movement (`fx cutoff`/`filter_type`) are your instruments here as much as the generator.
- Pin pads to the implied key — if a client just added a melody, voice your pad's chord to fit it; that's how a client steers harmony without touching master `scale`.
- Avoid stacking two wide reverbed pads — they turn to mud. One drone bed + one moving element (riser/sweep) is plenty. Leave headroom.
- Gens: `pad` (detuned triple-osc bed), `aether` (eerie theremin swells), `arco` (bowed-string pad), `noise_burst` (noise riser / air bed).

## deck it emits
- `track … gen pad|aether|arco|noise_burst [* <bars>]`
- `pad` knobs: `gen detune <0..30> cutoff <hz> attack <s> decay <s> sustain <0..1> release <s>` (slow attack+long release = swell)
- `aether` knobs: `gen glide <0..1> waver <0..1> tone <0..1> swell <0..1> air <0..1>` · `arco`: `gen voice cello|bass|viola pressure <0..1> bow <0..1> vibrato <0..1> body <0..1>`
- `noise_burst`: `noise attack <s> decay <s> tone <0..1> pitch_follow <0..1>` (long decay + high tone = riser/air)
- Sustained harmony: `note <midi> <startBeat> <durBeats> v <vel>` (long durBeats) or `steps`/`steps euclid` for rhythmic beds; `voice chord <…> octave <-2..0>`
- Space & movement: `fx cutoff <hz> res <0..1> filter_type lowpass|highpass reverb_send <0..1> lfo_rate <hz> lfo_depth <0..1>`
- Mix: `mix gain <0.2..0.4> pan <-1..1> eq_lo <dB> eq_hi <dB>`

## Examples
```tpl
deck 1
track Pad Drone id <me>_pad gen pad * 2
  gen detune 12 cutoff 1600 attack 1.2 decay 0.6 sustain 0.8 release 2.0
  voice chord min7 octave -1
  note 48 0 8 v 70
  fx reverb_send 0.55 cutoff 1800 filter_type lowpass
  mix gain 0.3 pan -0.2 eq_lo 2
```
```tpl
deck 1
track Noise Riser id <me>_riser gen noise_burst
  noise attack 1.8 decay 0.2 tone 0.85 pitch_follow 0.0
  steps x . . . . . . . . . . . . . . .
  fx filter_type highpass cutoff 600 reverb_send 0.6 lfo_rate 0.25 lfo_depth 0.8
  mix gain 0.25 pan 0.3
```
```tpl
deck 1
track Aether Bed id <me>_atmos gen aether
  gen glide 0.6 waver 0.5 tone 0.25 swell 0.7 air 0.4
  note 60 0 16 v 60
  fx reverb_send 0.7 cutoff 2200 res 0.2
  mix gain 0.28 pan 0.0 eq_hi -2
```
