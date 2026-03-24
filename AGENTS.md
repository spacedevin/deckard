# Agent / LLM editing contract — Deckard

## Prefer these surfaces

1. **[docs/schema/project-v2.json](docs/schema/project-v2.json)** — v2 shape (`generatorId` + `generatorParams` per channel). v1 JSON with `waveform` only is migrated on load.
2. **[src/model/Project.tish](src/model/Project.tish)** — `emptyProjectShell()`, `projectToJson` / `projectFromJson`. **`[src/model/ProjectLoad.tish](src/model/ProjectLoad.tish)`** — `loadProjectFromTpl(source)` builds a project from TPL (use for multiple songs); bundled default text in **`[projects/default.deckard.tpl](projects/default.deckard.tpl)`** / `DefaultDeckardTpl.tish`.
3. **[src/generators/](src/generators/)** — modular instruments; see [docs/GENERATORS.md](docs/GENERATORS.md).
4. **[src/model/Edits.tish](src/model/Edits.tish)** — small safe mutators (`toggleStep`, `addPianoNote`, `setAdsr`, …).
5. **`instrumentPresets`** — project-level named patches; applying copies `generatorId` + deep-cloned `params` onto the **selected track only**.  
   **ADSR** is inside `generatorParams` (per generator), not on the channel object. Mixer = gain / pan / mute / solo only.

## Invariants

- **`version`**: use `2` for generator-based projects; bump when breaking `generatorParams` shapes.
- **Times**: `startBeat` / `durBeats` are in **quarter-note beats**. Step `i` (0–15) = beat `i * 0.25` in the looping bar.
- **Channels**: preserve `id` strings when editing; UI keys off array index + `id`.
- **Do not** put sequencing rules inside JSX-only files; keep logic in `model/`, `schedule/`, `audio/`.

## Audio / compiler

- **`webAudioCreateContext()`** and **`jsUint8Array(n)`** are JS-target compiler builtins (see [docs/TISH_JS_BUILTINS.md](docs/TISH_JS_BUILTINS.md)). Do not replace with hand-written `.js` shims in app code.

## UI files

- **[src/ui/](src/ui/)** — layout and wiring only; business rules stay in model/schedule/audio.
