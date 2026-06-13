# Adding a generator (instrument module)

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

- **Generator list + params** live in [`src/ui/InstrumentPanel.tish`](../src/ui/InstrumentPanel.tish) for the **selected track only** (same selection as piano roll).
- Shared widgets are in [`src/ui/GeneratorParams.tish`](../src/ui/GeneratorParams.tish). The channel rack only shows the **instrument label badge**, not parameters.

## 6. Schema

Extend [`docs/schema/project-v2.json`](schema/project-v2.json) with a `generatorParams` shape for your id (optional JSON Schema oneOf).

## Matrix FM (`matrixFm`)

Sytrus-style multi-operator graph: define the patch in TPL with `track … gen matrix_fm` and an indented `gen_block matrix_fm` … `end gen_block`. Parsed graph lives in `channel.generatorSpec.graph`; see [`docs/TPL_GRAMMAR.md`](TPL_GRAMMAR.md) and [`docs/TPL_EXTENSION.md`](TPL_EXTENSION.md).

### Factory matrix FM presets

[`src/model/MatrixFmPresets.tish`](../src/model/MatrixFmPresets.tish) ships factory `matrixFm` patches that are auto-loaded into `project.instrumentPresets` for every new project ([`src/model/Project.tish`](../src/model/Project.tish) `emptyProjectShell`). Preset ids:

`mx_dub_growl`, `mx_pluck_neon`, `mx_reese_wide`, `mx_trap_808`, `mx_psy_squelch`, `mx_supersaw_stack`, `mx_deep_house_bass`, `mx_bright_lead`, `mx_airy_pad`, `mx_metallic_clank`, `mx_future_bass_wobble`, `mx_stab_chord`, `mx_sub_layer` (13 total).
