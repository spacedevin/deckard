# Tishact

**Tishact** is a small React-like layer in Tish: hooks (`useState`, `useMemo`, `useRef`, `useEffect`, `useLayoutEffect`), batched updates, `createRoot`, and **`h(tag, props, children[])`** for markup (or compiler JSX that lowers to the same `h`).

## Compiler modes (`tish compile --target js`)

| `--jsx` | JSX becomes | Notes |
|---------|-------------|--------|
| `tishact` (default) | `h("div", props, [children])` | Import `{ h, Fragment }` from `Tishact.tish`. No injected `__h`. |
| `legacy` | `__h(...)` | Self-contained preamble (old behavior). |
| `vdom` | `__vdom_h(...)` | Injected prelude sets `window.__TISH_JSX_VDOM` and `window.__tishactVdomPatch`. **`createRoot` reconciles** instead of `replaceChildren`. |

## API

| Export | Role |
|--------|------|
| `createRoot(container)` | `{ render(App) }` — `App` is `() => tree` (DOM nodes from `h`, or vnodes with `--jsx vdom`) |
| `useState`, `useMemo`, `useRef` | Same idea as React |
| `useEffect(fn, deps)` | Runs in a microtask after commit; optional cleanup return |
| `useLayoutEffect(fn, deps)` | Runs synchronously after DOM/vdom commit |
| `unstable_batchedUpdates(run)` | Sync batch then one flush |
| `h`, `Fragment`, `text` | DOM builder when not using vdom JSX |

Dependency arrays are compared **by value** (element-wise). Pass stable references when you mean “run once” (e.g. `[]`).

## Counter (hand-written `h`)

See [Counter.tish](../src/tishact/examples/Counter.tish). **Static demo:** `npm run build:counter`, open [examples/counter.html](../examples/counter.html) (from repo root, with `dist/counter-bundle.js` present).

## Controlled-style input

```tish
import { useState, h } from './tishact/Tishact.tish'

export fn LabeledInput(label) {
  let st = useState("")
  let v = st[0]
  let setV = st[1]
  return h("label", { class: "row" }, [
    label + " ",
    h("input", {
      type: "text",
      value: v,
      oninput: (e) => { setV(e.target.value) }
    }, [])
  ])
}
```

Default `tishact` mode re-mounts the whole tree each flush (or use `--jsx vdom` for incremental patch).

## Layout in this repo

| File | Purpose |
|------|---------|
| [src/tishact/Tishact.tish](../src/tishact/Tishact.tish) | Runtime |
| [src/tishact/examples/Counter.tish](../src/tishact/examples/Counter.tish) | Counter |
| [src/tishact/examples/counter-main.tish](../src/tishact/examples/counter-main.tish) | Counter entry for `build:counter` |

The Tish monorepo vendors a copy under `crates/tish_jsx_web/vendor/Tishact.tish` for releases.
