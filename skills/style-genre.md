---
id: style-genre
role: client
gates: add_track, adjust_instrument, pattern_steps, pattern_piano
weight: 1.2
---

# Style & Genre Steering

## Intent
Push the production toward a genre, energy, or tempo-FEEL purely by what you ADD — never by touching master.

## How to think
- You can't set bpm/scale/swing — those are the host's. So you STEER by content: the host hears your additions and adapts tempo, key, and levels to fit. Make the direction unmistakable.
- Imply a tempo-feel with the GRID, not the clock: a kick on steps 1 and 9 over a busy 16th hat reads as halftime; hits every 2 steps read as double-time. Same bpm, different feel.
- Imply a KEY and mood with notes: a minor `note` line + `voice chord minor` says 'go dark'; major/`sus4`/`add9` says 'open it up.' The host can formalize it with `scale` later — you propose by playing it.
- Pick genre-SIGNATURE pairings: `acid303` + a slithering 16th `note` line = acid techno; `sub808` + triplet/rolling hats = trap; `reeseBass` + a fast broken `drumSynth` break = dnb; `tine`/`halo` + sparse chords = lo-fi/house keys.
- This is a PROPOSAL by example. Commit hard enough to read as intent, but leave space — one clear genre gesture beats five competing ones. Don't fight what already plays; pivot or deepen it.
- To pivot, introduce ONE bold signature element (instrument + its rhythm) and let it sit. The host adapts the mix and tempo around your move; clutter just muddies the signal.

## deck it emits
- `track … gen <signature generator>` — choose by genre: `acid303`/`sub808`/`reeseBass`, `drumSynth`/`noise_burst`/`clap`, `tine`/`halo`/`bell`, `fm`/`aether`.
- `steps`/`steps euclid`/`step_pitch` — encode the tempo-FEEL and rhythm (halftime kick, rolling/triplet hats, broken breaks).
- `note … v <vel> [p] [r] [n]` + `voice octave|chord|arp|arprate` — encode key, mood, and melodic genre signal.
- `gen <param> <value>`, `fx cutoff|res|drive|reverb_send|filter_type`, `step_vel|prob|ratchet|nudge`, `mix gain|pan|eq_*` — shape the timbre to the genre.

## Examples
```tpl
deck 1
track Halftime Kick id <me>_htkick gen kick_deep
  steps x . . . . . . . x . . . . . . .
  step_vel 120 1 1 1 1 1 1 1 110 1 1 1 1 1 1 1
track Top Roll id <me>_roll gen noise_burst
  noise attack 0.001 decay 0.03 tone 0.85 pitch_follow 0.1
  steps x x x x x x x x x x x x x x x x
  step_ratchet 1 1 2 1 1 1 3 1 1 1 2 1 1 1 4 1
```
```tpl
deck 1
track Acid Pivot id <me>_acid gen acid303
  step_pitch 33
  steps x . x x . x . x x . x . x x . x
  fx cutoff 900 res 0.7 drive 0.5 filter_type lowpass
track Dark Stab id <me>_stab gen tine
  voice chord minor octave -1
  note 40 0 0.5 v 96 p 0.9
  note 43 1 0.5 v 88
  note 38 2 1 v 92
```
