# FL Studio–style generators vs Deckard

## How FL Studio structures instruments

1. **Channel rack = generator slots**  
   Each channel is not “a waveform”; it hosts **one generator plugin** (FL Keys, 3x OSC, Sytrus, Harmor, a sampler, etc.). Replacing the instrument means swapping the **entire plugin**, not a single dropdown inside a shared engine.

2. **Plugin = self-contained DSP + parameters**  
   Each plugin owns its patches, internal routing (oscillators, filters, envelopes), and automation targets. FL’s **Channel settings** still expose shared mixer routing (FX chain on insert tracks), but the **sound source** is the plugin.

3. **Formats**  
   Native FL plugins + wrapped **VST/VST3/AU**. The host loads a DLL/bundle, exposes a common parameter/automation surface, and streams MIDI → audio.

4. **Presets**  
   Per-plugin preset banks; switching preset does not change plugin type.

5. **Effects are separate**  
   Insert FX on mixer tracks are another plugin category. Our **mixer strip** is gain, pan, mute, solo (+ shared filter on the bus). **ADSR / synth envelopes live in the generator params**, like Fruity Slicer’s own envelope inside the plugin—not on the mixer fader.

## What we mirror in Deckard

| FL concept | Deckard |
|------------|-----------|
| Pick instrument (generator plugin) | `channel.generatorId` (`basicOsc`, `noiseBurst`, `fmTone`, …) |
| Plugin-specific patch | `channel.generatorParams` (shape depends on `generatorId`) |
| Swap instrument | Change `generatorId` + reset params via registry defaults |
| Add new instrument | New module under `src/generators/` + register in `Registry.tish` + branch in `Dispatch.tish` |

We do **not** host VSTs; each generator is **Tish + Web Audio** code paths. The same **modular boundary** as FL’s “one plugin per channel” applies.

**UI parity:** Like opening Fruity Slicer on one channel, the **Instrument** column edits **only the selected track’s** `generatorId` + `generatorParams`. Other tracks keep their own isolated parameter objects (deep-cloned when switching generator or loading a preset).
