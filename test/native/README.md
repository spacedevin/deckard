# Native `tish test` suites

Suites in this directory run on the **Tish VM** via `tish test` (wired as `npm run test:tish`,
and part of `npm test`). `tish.test.root` in `package.json` points here, so the runner discovers
these and nothing else.

## Why the split

`test/*.tish` (one level up) are the **JS-emit** sources: `npm run test:js` compiles each with
`tish build --target js` and runs it under node. That leg proves the compiled output; this one
proves language and library semantics on the VM. They test different things — keep both.

A suite moves up here once every module its import chain reaches can load on the VM. Today four
qualify. The rest stay out of discovery rather than sitting red, so a bare `tish test` is a
signal and not noise:

| suite | blocked on |
|-------|------------|
| `smoke`, `levels`, `multiplayer` | `globalThis.localStorage` in `model/InstrumentPresets.tish` and `model/LevelPresets.tish` — there is no global object on the VM, and an undefined identifier is a hard error that `try`/`catch` cannot absorb. Needs the storage backend injected (or a platform-resolved module) rather than read off `globalThis`. |
| `deckmix` | `Cannot set property of function` at `test/deckmix.test.tish` — a separate bug, unrelated to the `undefined` work. |

## Porting the rest

Most of the original blockers were the JS null-ish idiom `x !== null && x !== undefined`. Tish
has no `undefined`, and its JS target lowers `x !== null` to `x != null` — which still excludes
`undefined` — so dropping the `undefined` half is equivalent on both targets. That transform is
already applied across `src/`.

What is **not** safely mechanical: a bare `x === undefined` with no adjacent null check. In JS
that is false for `null`; `x === null` emits `x == null`, which is true. Convert those only where
the intent is "normalise a missing value to null", and re-run `npm run test:js` afterwards.
