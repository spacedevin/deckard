# TPL generator extensions (`gen_block`)

Heavy generators (slicer, granular, multi-stage graphs) use **`gen_block`** in TPL. The core lexer/parser collects lines until `end gen_block` and passes them to **`TplExtension.parseGenBlock`** in [`src/tpl/TplExtension.tish`](../src/tpl/TplExtension.tish).

- **v1 scaffold:** `parseGenBlock` returns `{ kind, tplHeaderId, version: 1, raw: string[] }` stored on `channel.generatorSpec`.
- **`matrix_fm` (v2):** `parseGenBlock` fills `generatorSpec.graph` with operators, modulation matrix, filters, and routes (see [`docs/schema/project-v2.json`](schema/project-v2.json) `$defs/matrixFmGraph`). The audio engine is [`src/generators/MatrixFm.tish`](../src/generators/MatrixFm.tish).
- **`patch`:** `parseGenBlock` fills `generatorSpec.graph` with `{ nodes, conns, envs, dur }` via `parsePatchGraph`. A modular voice — osc/noise/filter/shaper/gain nodes, `conn` wiring, and breakpoint `env` automation with per-trigger expressions (`note`, `dur`, `vel`, arithmetic). The audio engine is [`src/generators/Patch.tish`](../src/generators/Patch.tish). This is the substrate for **macros** — named, parameterized patch templates ([`src/tpl/Macros.tish`](../src/tpl/Macros.tish)). Full grammar (patch, bar selectors, macros): [`docs/TPL_GRAMMAR.md`](TPL_GRAMMAR.md).

Audio engines read `generatorParams` for simple plugins; `matrixFm` and `patch` read `generatorSpec.graph` (each falls back to basic osc if the graph is empty).
