# Lattish

**Lattish** is a small React-like layer in Tish: hooks (`useState`, `useMemo`, `useRef`, `useEffect`, `useLayoutEffect`), batched updates, `createRoot`, and **`h(tag, props, children[])`** for markup (or compiler JSX that lowers to the same `h`).

## Compiler

`tish build --target js` always lowers JSX into `h("div", props, [children])` calls that resolve against `{ h, Fragment }` from `@tishlang/lattish` — no flag, no separate JSX mode, no injected runtime. Just import `@tishlang/lattish` and write JSX.

## API

| Export | Role |
|--------|------|
| `createRoot(container)` | `{ render(App) }` — `App` is `() => tree` of DOM nodes built from `h` (or JSX, which lowers to `h`) |
| `useState`, `useMemo`, `useRef` | Same idea as React |
| `useEffect(fn, deps)` | Runs in a microtask after commit; optional cleanup return |
| `useLayoutEffect(fn, deps)` | Runs synchronously after the DOM commit |
| `runBatched(run)` | Sync batch then one flush |
| `h`, `Fragment`, `text` | DOM builder when writing without JSX |

Dependency arrays are compared **by value** (element-wise). Pass stable references when you mean “run once” (e.g. `[]`).



## Controlled-style input

```tish
import { useState, h } from '@tishlang/lattish'

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

`createRoot` re-mounts the whole tree on each flush; that's the only render model — the same compiler output drives both interactive UIs and headless renders.


