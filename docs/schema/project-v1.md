# Project schema v1

- **Times**: `startBeat` / `durBeats` are in **quarter-note beats** (1.0 = one quarter note).
- **Steps**: 16 steps per bar (16th notes). Step `i` sounds at beat `i * 0.25` within the looping bar.
- **pitchBend**: semitone offset (-12..12 typical). Interpolated between automation points.
- **masterGain**: linear 0..2, interpolated between points.

LLM edits: change `channels[].pianoNotes`, `channels[].steps`, or `bpm`; bump `version` only when breaking shape.
