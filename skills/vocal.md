---
id: vocal
role: client
gates: add_track, adjust_instrument, pattern_piano, channel_mix
weight: 0.9
---

# Vocal & Formant Lines

## Intent
Add the human element — a vowel hook, choir pad, or choppy vox stab that gives the track a voice without crowding the mids.

## How to think
- Reach for a vocal when the production has rhythm + bass but no hook or top-line identity; a single sung phrase or stab can define the whole drop.
- `formantVocal` = expressive sung/glided lead (use `note` lines, let `glide` bend between pitches); `syncChoir` = lush 80s analog choir pad (sustained chords); `ttsVocal`/`meSpeakVocal` = robotic spoken/chopped texture (short `steps` hits, not melodies).
- There is NO lyric/text token in co-DJ deck — you sequence vocals by pitch (`note`/`steps`) and shape them with generator knobs, `voice`, and `fx reverb_send`. Don't try to emit words.
- Vocals own the mid band, so carve room: keep gain moderate, ride `eq_mid`, and pan a stab off-center if a lead already sits up the middle. One vocal element at a time — stacked vocals turn to mud.
- Chops/stabs sit best rhythmically locked to the beat (short notes, `step_nudge`/`prob` for swing); sung hooks want space and `reverb_send` for depth.
- As a client: a key-implying sung melody is your strongest genre/energy steer — show the direction in the notes. As a host: pull a vocal forward (gain/EQ) when it's the hook, duck it under the next builder.

## deck it emits
- `track <Name> id <me>_<x> gen formantVocal|syncChoir|ttsVocal|meSpeakVocal`
- `note <midi> <startBeat> <durBeats> v <vel> [p <prob>] [r <ratchet>] [n <nudge>]` — pitched vocal lines (melody / chopped stabs).
- `steps <16 x/.>` + `step_pitch <midi>` — rhythmic spoken/robotic chops.
- `gen <param> <value>` knobs — `formantVocal`: `glide vibDepth vibRate humanize release`; `syncChoir`: `vowelShift morphRate morphAmt ensembleDetune vibRate vibAmt highpass`.
- `voice octave|chord|arp|inversion|strum` — chord a choir into a pad (e.g. `chord min7`).
- `mix gain|pan|eq_lo|eq_mid|eq_hi` · `fx reverb_send|cutoff|filter_type` — seat it in the mix and add depth.

## Examples
```tpl
deck 1
track Vowel Hook id <me>_vox gen formantVocal
  gen glide 0.18 vibDepth 0.03 vibRate 5 humanize 0.6
  voice octave 0
  note 64 0 1 v 100
  note 67 1 1 v 96
  note 71 2 2 v 104 n 0.04
  mix gain 0.6 pan 0
  fx reverb_send 0.4
```
```tpl
deck 1
track Vox Stab id <me>_voxchop gen ttsVocal
  step_pitch 60
  steps x . . x . . x . x . . . x . x .
  step_vel 110 1 1 90 1 1 120 1 80 1 1 1 100 1 95 1
  step_nudge 0 0 0 0.05 0 0 0 0 -0.03 0 0 0 0 0 0 0
  mix gain 0.5 pan -0.25 eq_mid -1
```
```tpl
deck 1
track Choir Pad id <me>_choir gen syncChoir
  gen vowelShift 22 morphRate 0.4 morphAmt 12 ensembleDetune 15
  voice chord min7 octave 0
  note 55 0 8 v 80
  mix gain 0.45 pan 0
  fx reverb_send 0.55
```
