# TPL generator extensions (`gen_block`)

Heavy generators (slicer, granular, multi-stage graphs) use **`gen_block`** in TPL. The core lexer/parser collects lines until `end gen_block` and passes them to **`TplExtension.parseGenBlock`** in [`src/tpl/TplExtension.tish`](../src/tpl/TplExtension.tish).

- **v1 scaffold:** `parseGenBlock` returns `{ kind, version: 1, raw: string[] }` stored on `channel.generatorSpec`.
- **Future:** register per-`generatorId` parsers that populate `generatorSpec.graph` (or similar) and **emit** round-trips via extended `emitGenBlock`.

Audio engines read `generatorParams` for simple plugins; graph-based plugins will read `generatorSpec` when implemented.
