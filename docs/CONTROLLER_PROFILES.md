# Controller profiles (hardware → lane ops)

Profiles constrain **MIDI** → same envelope as stream (`laneId` + synthetic `authorId`).

## Novation Launchpad X (grid 8×8)

**Profile id**: `launchpad_x_v1`

| Control | Op |
|---------|-----|
| Pads 0–15 | Toggle step `i` on **focused** channel (skill: `pattern_steps`) |
| Pads 16–23 | Select channel index 0–7 (focus) |
| Pads 24–31 | Mute channel `i-24` (`channel_mix`) |

MIDI note map is configurable; above is logical.

## Akai APC40 MKII (sketch)

**Profile id**: `apc40_mk2_v1`

| Control | Op |
|---------|-----|
| Channel fader i | `mix gain` mapped 0–1 |
| Track button i | mute toggle |
| Clip matrix (row i, col j) | optional: select bar page for steps |

## Generic 4×4 drum pad

**Profile id**: `pad_4x4_steps`

- 16 pads = 16 steps of focused track.

## Web MIDI

Browser requests `navigator.requestMIDIAccess`; input → profile router → `window.__coDjHubSend` or local overlay emit.

See `src/codj/MidiProfiles.tish` for note→action tables.
