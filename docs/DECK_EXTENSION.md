# Deckard — `gen_block` extensions

Core collection and dialect registration live in **`@spacedevin/deck`** — see
[package DECK_EXTENSION.md](https://github.com/spacedevin/deck/blob/main/docs/DECK_EXTENSION.md)
(`@spacedevin/deck/extension`) and host boot in [`DeckIds.tish` (@spacedevin/deck-synths)](https://github.com/spacedevin/deck/blob/main/packages/synths/src/DeckIds.tish).

Deckard registers:

| Dialect ids | Parser | Audio engine | Spec shape |
|-------------|--------|--------------|------------|
| `patch`, `modular`, `synth` | [`PatchGraph.tish`](https://github.com/spacedevin/deck/blob/main/packages/synths/src/PatchGraph.tish) | [`Patch.tish`](https://github.com/spacedevin/deck/blob/main/packages/synths/src/Patch.tish) | `{ nodes, conns, envs, dur }` on `generatorSpec.graph` |
| `matrixFm`, `matrix_fm` | [`MatrixFmGraph.tish`](https://github.com/spacedevin/deck/blob/main/packages/synths/src/MatrixFmGraph.tish) | [`MatrixFm.tish`](https://github.com/spacedevin/deck/blob/main/packages/synths/src/MatrixFm.tish) | operators, mod matrix, filters, routes (schema [`project-v2.json`](schema/project-v2.json) `$defs/matrixFmGraph`) |

Until registered, `parseGenBlock` returns `{ kind, tplHeaderId, version: 1, raw }` only.

**Macros** are named patch templates registered via `registerBuiltinMacros` ([`BuiltinMacros.tish`](https://github.com/spacedevin/deck/blob/main/packages/synths/src/BuiltinMacros.tish) / [`MacroVoice.tish`](../src/model/MacroVoice.tish)). A `gen <macroName>` expands to a `gen_block patch` at load.

Simple plugins read `generatorParams`; `matrixFm` and `patch` read `generatorSpec.graph` (each falls back if the graph is empty).

Line-level dialect syntax (nodes, `op`/`mod`/`route`, …): package [DECK_EXTENSION.md](https://github.com/spacedevin/deck/blob/main/docs/DECK_EXTENSION.md) (also `@spacedevin/deck/extension` after install).
