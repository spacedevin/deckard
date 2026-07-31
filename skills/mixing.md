---
id: mixing
role: host
gates: channel_mix, master_mixer
weight: 1.4
---

# Mixing & Master Glue

## Intent
Carve a clear space for every lane and glue the whole mix on the master so nothing masks, clips, or muds.

## How to think
- You SHAPE, you don't add: your tools are gain, pan, EQ and the master bus — use them to make the parts other lanes brought already played fit together.
- Carve the low end first: kick and bass own the sub. Keep both centred (pan 0) and roll the bass `eq_lo` down a touch so they don't fight; thin one to make room for the other.
- Spread the stereo image: pan hats/perc/percussive textures off-centre (±0.2..0.5), keep bass and lead vocals centred. Width is for the ear-candy, not the foundation.
- Carve mids for the lead: if a vocal or lead is buried, dip competing pads/chords `eq_mid` a few dB rather than cranking the lead's gain.
- Glue on the master sparingly: `master_mix` is output EQ ONLY (eq_lo/mid/hi) — a gentle high-shelf or low-trim to seat the bus. There is no master comp/reverb line, so build 'glue' from balanced per-lane levels and a shared `fx reverb_send` space, not a magic master knob.
- Balance lanes, don't bury them: use `actor_mix <lane> gain` to set relative loudness between players; reach for `mute`/`solo` only to arrange, then restore. If a new busy lane crowds the mix, pull a competing one back rather than turning everything up.

## deck it emits
- Per-track (channel_mix, on your own `<me>_` lanes): `mix gain <0..1> pan <-1..1> eq_lo <dB> eq_mid <dB> eq_hi <dB> [mute 1] [solo 1]`
- Per-track FX space (channel_mix): `fx reverb_send <0..1> cutoff <hz> res <0..1> drive <0..1> filter_type <lowpass|highpass|bandpass|notch>`
- Master bus EQ glue (master_mixer, master-scope): `master_mix eq_lo <dB> eq_mid <dB> eq_hi <dB>`
- Per-lane balance (master_mixer, master-scope): `actor_mix <lane> gain <n> eq_lo <dB> eq_mid <dB> eq_hi <dB> [mute 1] [solo 1]`

## Examples
```tpl
deck 1
track Kick id <me>_kick gen kick_deep
  mix gain 0.9 pan 0 eq_lo 2 eq_hi -1
track Sub id <me>_sub gen sub808
  mix gain 0.78 pan 0 eq_lo -3 eq_mid -1
  fx cutoff 220 filter_type lowpass
```
```tpl
deck 1
track Hat id <me>_hat gen noise_burst
  mix gain 0.55 pan 0.35 eq_lo -6 eq_hi 3
  fx reverb_send 0.25
track Perc id <me>_perc gen clap
  mix gain 0.5 pan -0.4
  fx reverb_send 0.3
```
```tpl
deck 1
master_mix eq_lo -1 eq_mid 0 eq_hi 1.5
actor_mix client-a gain 0.85 eq_mid -2
```
