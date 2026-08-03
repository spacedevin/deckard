# Deckard — `gen_block` extensions

Core collection and dialect registration live in **`@spacedevin/deck`** — see
[package DECK_EXTENSION.md](https://github.com/spacedevin/deck/blob/main/docs/DECK_EXTENSION.md)
(`@spacedevin/deck/extension`) and host boot in [`src/generators/DeckIds.tish`](../src/generators/DeckIds.tish).

Deckard registers:

| Dialect ids | Parser | Audio engine | Spec shape |
|-------------|--------|--------------|------------|
| `patch`, `modular`, `synth` | [`PatchGraph.tish`](../src/deckfile/PatchGraph.tish) | [`Patch.tish`](../src/generators/Patch.tish) | `{ nodes, conns, envs, dur }` on `generatorSpec.graph` |
| `matrixFm`, `matrix_fm` | [`MatrixFmGraph.tish`](../src/deckfile/MatrixFmGraph.tish) | [`MatrixFm.tish`](../src/generators/MatrixFm.tish) | operators, mod matrix, filters, routes (schema [`project-v2.json`](schema/project-v2.json) `$defs/matrixFmGraph`) |

Until registered, `parseGenBlock` returns `{ kind, tplHeaderId, version: 1, raw }` only.

**Macros** are named patch templates registered via `registerBuiltinMacros` ([`BuiltinMacros.tish`](../src/generators/BuiltinMacros.tish) / [`MacroVoice.tish`](../src/model/MacroVoice.tish)). A `gen <macroName>` expands to a `gen_block patch` at load.

Simple plugins read `generatorParams`; `matrixFm` and `patch` read `generatorSpec.graph` (each falls back if the graph is empty).

Line-level dialect syntax (nodes, `op`/`mod`/`route`, …): package [DECK_EXTENSION.md](https://github.com/spacedevin/deck/blob/main/docs/DECK_EXTENSION.md) (also `@spacedevin/deck/extension` after install).
