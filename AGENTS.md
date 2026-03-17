# Agent / LLM editing contract — tish-midi

## Prefer these surfaces

1. **[docs/schema/project-v1.json](docs/schema/project-v1.json)** — canonical shape.
2. **[src/model/Project.tish](src/model/Project.tish)** — `defaultProject()`, `projectToJson` / `projectFromJson`.
3. **[src/model/Edits.tish](src/model/Edits.tish)** — small safe mutators (`toggleStep`, `addPianoNote`, `setAdsr`, …).

## Invariants

- **`version`**: keep `1` unless you introduce breaking field renames (then bump and document).
- **Times**: `startBeat` / `durBeats` are in **quarter-note beats**. Step `i` (0–15) = beat `i * 0.25` in the looping bar.
- **Channels**: preserve `id` strings when editing; UI keys off array index + `id`.
- **Do not** put sequencing rules inside JSX-only files; keep logic in `model/`, `schedule/`, `audio/`.

## Audio / compiler

- **`webAudioCreateContext()`** and **`jsUint8Array(n)`** are JS-target compiler builtins (see [docs/TISH_JS_BUILTINS.md](docs/TISH_JS_BUILTINS.md)). Do not replace with hand-written `.js` shims in app code.

## UI files

- **[src/ui/](src/ui/)** — layout and wiring only; business rules stay in model/schedule/audio.
