---
id: harmony-chords
role: client
gates: add_track, adjust_instrument, pattern_piano, channel_mix
weight: 1.0
---

# Chords & Harmony

## Intent
Lay the harmonic bed — chord stabs and pads that imply the key and mood the production is leaning toward, and let everything else sit on top.

## How to think
- Reach for harmony when a beat and bass exist but the chord is only implied; you make it explicit. If a melody already states the changes, support it — don't fight it.
- One `note` line + a `voice chord <quality>` block expands one note into a full chord — author the root and let the voice do the spelling. Don't hand-stack three notes.
- Pick the quality to set mood: `minor`/`min7` = dark/moody, `maj7`/`add9` = warm/open, `dom7` = tense/funky, `sus4` = suspended/unresolved. As a CLIENT this is how you STEER — a min7 pad implies the whole room go darker without touching master.
- Mind harmonic rhythm: stabs land on the downbeats (one chord per bar or half-bar), pads sustain underneath. Leave the high mids and top open for melody — roll `eq_hi` down on a pad so it never crowds a lead.
- Voicing matters: `inversion 1st`/`2nd` keeps motion smooth between changes; `strum 20..60` humanizes (essential on `guitar`); octave the pad down (`voice octave -1`) to stay out of the melody's register.
- As HOST, mostly SHAPE existing harmony — balance the pad's gain, EQ it out of the kick's way — rather than piling on more chords. As CLIENT, ADD the missing harmonic layer and keep it spacious.

## deck it emits
- `track <Name> id <me>_<x> gen <pad|tine|halo|bell|basic_osc|guitar>`
- `note <midi> <startBeat> <durBeats> v <vel>` lines (the chord root; one per change)
- `voice chord <major|minor|min7|maj7|dom7|sus4|add9|dim|aug> [inversion <root|1st|2nd>] [strum <0..150>] [octave <-2..2>]`
- `mix gain <0..1> pan <-1..1> [eq_hi <dB>]` · `fx reverb_send <0..1> [cutoff <hz>]`
- `adsr a <s> d <s> s <0..1> r <s>` to set stab-vs-pad envelope

## Examples
```tpl
deck 1
track Min7 Pad id <me>_pad gen pad
  voice chord min7 inversion root octave -1
  adsr a 0.6 d 0.4 s 0.8 r 1.2
  mix gain 0.42 pan 0 eq_hi -3
  fx reverb_send 0.45 cutoff 2400
  note 57 0 4 v 70
```
```tpl
deck 1
track Strum id <me>_gtr gen guitar
  voice chord maj7 strum 40 inversion 1st
  mix gain 0.5 pan 0.25
  fx reverb_send 0.3
  note 52 0 2 v 88
  note 50 2 2 v 84
```
```tpl
deck 1
track Stab id <me>_stab gen tine
  voice chord dom7 inversion 2nd octave 0
  adsr a 0.005 d 0.18 s 0.0 r 0.2
  mix gain 0.46 pan -0.2 eq_hi -2
  note 48 0 1 v 100
  note 48 2 1 v 92
```
