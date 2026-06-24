# Adding a generator (instrument module)

> **Catalog (current):** there are **33 fixed generators** + **8 macro voices**. The authoritative id list is
> `generatorCatalog()` in [`src/generators/Registry.tish`](../src/generators/Registry.tish) and `macroCatalog()`
> in [`src/model/MacroVoice.tish`](../src/model/MacroVoice.tish); the picker grouping is `VOICE_GROUPS` in
> [`src/ui/InstrumentStack.tish`](../src/ui/InstrumentStack.tish). For the agent-facing list by role + the
> `gen <id>` TPL aliases, see [`TPL_AGENT_GRAMMAR.md`](TPL_AGENT_GRAMMAR.md). This page is the **how-to-add** guide.

## 1. Pick an `id`

Stable string, e.g. `mySynth`. Used in project JSON and dispatch.

## 2. Register in [`src/generators/Registry.tish`](../src/generators/Registry.tish)

- Add `{ id, label, description }` to `generatorCatalog()`.
- Add defaults in `defaultParamsForGeneratorId()`.

## 3. Implement audio in `src/generators/YourGenerator.tish`

Export `playYourGenerator(ctx, bus, t, midi, vel, durSec, ch, bendSemis)`:

- Build a short-lived Web Audio subgraph.
- Connect the **last node** to `bus.input` (channel filter → gain → pan → master).
- Read patch and envelope from `ch.generatorParams` if applicable. The ADSR lives in `generatorParams`, not on the channel root — do `let p = ch.generatorParams` then read `p.attack` / `p.decay` / `p.sustain` / `p.release` (see [`src/generators/BasicOsc.tish`](../src/generators/BasicOsc.tish)).

Use [`midiToHz`](../src/schedule/Engine.tish) for pitched notes.

## 4. Dispatch in [`src/generators/Dispatch.tish`](../src/generators/Dispatch.tish)

Call your `play...` when `ch.generatorId === "yourId"`. Unknown ids fall back to `basicOsc`.

## 5. UI

- **Generator picker + per-voice designers** live in [`src/ui/InstrumentStack.tish`](../src/ui/InstrumentStack.tish) — the `VOICE_GROUPS` dropdown + the inline designer/raw cards for the **selected track**.
- Shared knob/select widgets are in [`src/ui/InstrumentKit.tish`](../src/ui/InstrumentKit.tish) and [`src/ui/GeneratorParams.tish`](../src/ui/GeneratorParams.tish). The channel rack only shows the **instrument label badge**, not parameters.

## 6. Schema

Extend [`docs/schema/project-v2.json`](schema/project-v2.json) with a `generatorParams` shape for your id (optional JSON Schema oneOf).

## Matrix FM (`matrixFm`)

Sytrus-style multi-operator graph: define the patch in TPL with `track … gen matrix_fm` and an indented `gen_block matrix_fm` … `end gen_block`. Parsed graph lives in `channel.generatorSpec.graph`; see [`docs/TPL_GRAMMAR.md`](TPL_GRAMMAR.md) and [`docs/TPL_EXTENSION.md`](TPL_EXTENSION.md).

### Factory matrix FM presets

[`src/model/MatrixFmPresets.tish`](../src/model/MatrixFmPresets.tish) ships **25** factory `matrixFm` patches that are auto-loaded into `project.instrumentPresets` for every new project ([`src/model/Project.tish`](../src/model/Project.tish) `emptyProjectShell`). They cover bass (`mx_dub_growl`, `mx_reese_wide`, `mx_reese_grind_rm`, `mx_dx_knock_bass`, `mx_deep_house_bass`, `mx_sub_layer`, `mx_trap_808`, `mx_future_bass_wobble`), leads/plucks (`mx_pluck_neon`, `mx_chrome_pluck_lead`, `mx_bright_lead`, `mx_supersaw_stack`, `mx_psy_squelch`), keys/organ (`mx_dx_mark_v_suitcase`, `mx_wurli_barky_reed`, `mx_drawbar_cathedral_organ`), bells/mallets (`mx_cathedral_tubular_bells`, `mx_bloom_gong_gamelan`, `mx_vibe_marimba_mallet`, `mx_metallic_clank`), pads/choirs (`mx_airy_pad`, `mx_choir_of_the_void`, `mx_aurora_drift`, `mx_fanfare_swell`), and `mx_stab_chord`. The file is the source of truth — don't hand-maintain this list elsewhere.
