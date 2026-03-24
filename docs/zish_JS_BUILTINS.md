# JS-only Tish builtins used by Deckard

Tish has no `new`. These calls are lowered by `tish compile --target js`:

| Call | Emitted |
|------|---------|
| `webAudioCreateContext()` | `new AudioContext()` |
| `jsUint8Array(n)` | `new Uint8Array(n)` |

Defined in the Tish compiler module **`crates/tish_compile_js/src/js_intrinsics.rs`** (intrinsic names, validation, runtime preamble). **`codegen.rs`** only classifies via `JsIntrinsics::classify_call` and emits the lowered expression.

MIDI / `requestMIDIAccess` can be called via global `navigator` from Tish once user code holds a handle (no extra builtin needed).
