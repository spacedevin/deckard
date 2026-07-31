# Deckard: deck Audio System & Track Generation Guide

## 1. System Overview
Deckard is a token-streamed, live-coding DAW designed as the auditory counterpart to a 3D Solar System viewer. It does not use external audio files (no .mp3 or .wav samples). Instead, it synthesizes all audio in real-time using mathematical oscillators, noise buffers, and custom audio node routing provided by fixed generators and macro voices.

The system features a multi-lane co-DJ environment where AI agents and humans collaborate by streaming deck (deck). Nothing is pre-rendered; all audio is generated in-app from the token stream. 

## 2. Creative Inspiration & Theme
The creative direction is "Retro-Futuristic Space."
**Vibe**: Expansive, cosmic, data-dense, and occasionally aggressive (Cyberpunk, Sci-Fi).
**Genres**: Ambient Space, Cyberpunk, Deep Techno, Trance, Downtempo, Psytrance, Halftime Dub, Synthwave, Liquid DnB, Midtempo Bass, and Lo-Fi House.
**Harmonic Constraint (Crucial)**: To ensure the Auto-DJ can seamlessly mix any track into any other track without harmonic clashing, all tracks are written in **C Minor / Eb Major**. Root notes, arpeggios, and chord progressions must strictly pull from this defined palette.

### Defined Harmonic Palette
- **C minor**: C, Eb, G (MIDI 48, 51, 55)
- **Ab major**: Ab, C, Eb (MIDI 44, 48, 51)
- **Eb major**: Eb, G, Bb (MIDI 51, 55, 58)
- **G minor**: G, Bb, D (MIDI 55, 58, 62)
- **Bb major**: Bb, D, F (MIDI 58, 62, 65)

## 3. The Multi-Track Structure
There is no strict 5-stem limit in Deckard, but a well-rounded generated song should cover discrete elements. Each track in deck is defined with a unique lane ID and a specific generator:
- **KICK**: Low-end transients.
- **PERC/HATS**: Noise-based percussion, hi-hats, and snares.
- **BASS**: Sub-bass, reese basses, acid lines, and midtempo wobbles.
- **CHORDS/PADS**: Lush, sustained harmonic content.
- **ARP/LEADS**: Plucks, metallic tones, and noise sweeps.

## 4. Audio Engine API (Available Instruments)
When writing a new track, the LLM must ONLY use the generators and macros provided by the Deckard system. You select these in the track header with `gen <generatorId>`.

Common Generators & Macros:
- **Percussion/Hats**: `drumSynth`, `noise_burst`
- **Leads/Synths**: `basic_osc`, `fm`, `syncLead`, `aether`
- **Bass**: `bass_acid`, `bass_reese`, `bass_wobble` (macros)
- **Kicks**: `kick_edm`, `kick_deep`, `kick_distorted` (macros)
- **Pads**: `pad`
- **Matrix FM**: `matrix_fm` (for complex FM patches)

## 5. Track Data Structure & Sequencer Logic
Tracks are defined using deck. A track block starts with `track <Name> id <id> gen <generator> [* <bars>]`.
- **Rhythm (Steps)**: Use `steps x . . .` or `steps euclid <hits> 16`. The step sequencer uses a 16-step grid per bar.
- **Melody (Piano Roll)**: Use `note <midi> <startBeat> <durBeats> v <velocity> [bar <selector>]`. Beats are in quarter-notes.
- **Mix**: Use `mix gain <0..1> pan <-1..1>`.

### Example deck Track Template
```tpl
deck 1
bpm 100

# 1. KICK: Four-on-the-floor
track Kick id ai_kick gen kick_deep
  mix gain 0.9 pan 0
  steps x . . . x . . . x . . . x . . .

# 2. HATS: Off-beats + occasional 16th note syncopation
track Hats id ai_hats gen noise_burst
  mix gain 0.6
  noise attack 0.002 decay 0.12 tone 0.8 pitch_follow 0.1
  step_pitch 60
  steps . . x . . . x . . . x . . . x .

# 3. BASS (C2 = 36, Ab1 = 32, G1 = 31)
track Bass id ai_bass gen bass_reese * 4
  mix gain 0.8
  note 36 0 4 v 100 bar 0,2
  note 32 0 4 v 100 bar 1
  note 31 0 4 v 100 bar 3

# 4. CHORDS (C minor: 48, 51, 55; Ab major: 44, 48, 51)
track Chords id ai_chords gen pad * 4
  mix gain 0.7
  # C minor
  note 48 0 4 v 90 bar 0,2
  note 51 0 4 v 90 bar 0,2
  note 55 0 4 v 90 bar 0,2
  # Ab major
  note 44 0 4 v 90 bar 1
  note 48 0 4 v 90 bar 1
  note 51 0 4 v 90 bar 1
  # G minor
  note 43 0 4 v 90 bar 3
  note 46 0 4 v 90 bar 3
  note 50 0 4 v 90 bar 3

# 5. ARP: Complex rhythmic pluck using random probability
track Arp id ai_arp gen fm
  mix gain 0.7
  fm ratio 1 mod_index 6 carrier sine mod sine
  adsr a 0.008 d 0.12 s 0.35 r 0.15
  note 60 0 0.25 v 90 p 0.8
  note 63 0.5 0.25 v 90 p 0.6
  note 67 1.5 0.25 v 90 p 0.7
```

## 6. Prompting Instructions for the Next LLM
Copy and paste the following to the next LLM to generate more tracks:

"I am providing you with the specification for the 'Deckard' token-streamed DAW. Your task is to generate a new procedural music song using deck (deck).
Rules:
1. You must ONLY write in C Minor / Eb Major to ensure harmonic compatibility.
2. You must ONLY use the provided generators and macros (e.g., `kick_deep`, `noise_burst`, `bass_reese`, `pad`, `fm`).
3. Define your tracks using `track <Name> id <id> gen <generator>`. Prefix your track IDs with `ai_` (e.g. `ai_kick`).
4. Map your instruments properly to build a full mix (Kick, Hats, Bass, Chords, Arp/Lead).
5. Use `steps` for percussion (16 steps) and `note <midi> <startBeat> <durBeats> v <vel>` for melodies (quarter-note beats).
6. Be highly creative with rhythms, step probabilities (`p 0.8` on notes), multi-bar changes (`bar 0,2` / `bar 1`), and instrument parameters.
7. Output ONLY the raw deck text representing the new song, starting with `deck 1` and `bpm <tempo>`."
