# Controller profiles (hardware → lane ops)

Profiles constrain **MIDI** → same envelope as stream (`laneId` + synthetic `authorId`).

## Implemented behavior

There is currently a **single sketch** in `src/codj/MidiProfiles.tish` (no named profile selection). `coDjInitWebMidi` requests `navigator.requestMIDIAccess` and, on every note-on, maps `note % 8` → a **temporary gain overlay** (`coDjSetGainOverlay`, velocity/127) on the first 8 channels. That is the whole MIDI surface today; the profile tables below are not yet wired.

## Novation Launchpad X (grid 8×8) — Planned profile sketch, not yet wired

**Profile id**: `launchpad_x_v1`

| Control | Op |
|---------|-----|
| Pads 0–15 | Toggle step `i` on **focused** channel (skill: `pattern_steps`) |
| Pads 16–23 | Select channel index 0–7 (focus) |
| Pads 24–31 | Mute channel `i-24` (`channel_mix`) |

MIDI note map is configurable; above is logical.

## Akai APC40 MKII — Planned profile sketch, not yet wired

**Profile id**: `apc40_mk2_v1`

| Control | Op |
|---------|-----|
| Channel fader i | `mix gain` mapped 0–1 |
| Track button i | mute toggle |
| Clip matrix (row i, col j) | optional: select bar page for steps |

## Generic 4×4 drum pad — Planned profile sketch, not yet wired

**Profile id**: `pad_4x4_steps`

- 16 pads = 16 steps of focused track.

## Web MIDI

Browser requests `navigator.requestMIDIAccess`; each note-on currently routes straight to a local temporary-gain overlay (no profile router yet). A profile router dispatching to `window.__coDjHubSend` is Planned.

See `src/codj/MidiProfiles.tish` for the implemented note%8 → overlay sketch.
