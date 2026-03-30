# JavaScript `new` in Tish (Deckard)

Tish supports **`new`** when compiling to JavaScript (`tish compile --target js`). Use normal constructor syntax, for example:

- `new AudioContext()` — Web Audio context (see `src/audio/Engine.tish`)
- `new Uint8Array(n)` — binary buffers (see `src/ui/Scope.tish`)

`new` is **not** supported for native Rust output; use `--target js` for browser APIs.

MIDI / `requestMIDIAccess` can be called via global `navigator` from Tish once user code holds a handle (no extra builtin needed).
