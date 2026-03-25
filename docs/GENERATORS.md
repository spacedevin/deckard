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
- Read patch from `ch.generatorParams` and envelope from `ch.attack` / `decay` / `sustain` / `release` if applicable.

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
