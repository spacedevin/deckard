# Deckard

A **token-streamed, live-coding DAW** in **[Tish](https://github.com/tishlang/tish)** (JS target + JSX).
Humans and LLM agents **co-DJ** by streaming a small line-oriented language (**TPL**) that the app
**decodes into live-synthesised stems** — never WAV/audio files. *MIDI × live-coding, designed for LLM
token streams, with a traditional DAW on top.*

FL-style surfaces sit on top of the language: step sequencer, piano roll (canvas), per-channel
**generator instruments** (basic osc / noise burst / FM / matrix FM) with per-generator ADSR, a
track → actor → master mixer (gain / pan / 3-band EQ / mute / solo), Ableton-style session/scene
launcher, master scope, and JSON + TPL import/export.

**New here?** Read **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the full overview, vision, and
end-to-end signal path. Run the tests with `npm test`.

## Dev

```bash
npm install      # one-time (Vite + tish CLI)
npm run dev      # Vite dev server — save a .tish file and the browser auto-reloads
```

`npm run dev` runs **Vite** with a small local plugin ([`vite-plugin-tish.js`](vite-plugin-tish.js))
that compiles `src/main.tish` → `dist/bundle.js` with `tish build --target js` and full-reloads on any
`.tish` / `styles.css` change. (Lattish re-mounts the whole tree each render, so a full reload is the
right strategy — there's no HMR state to preserve.) Open the printed URL and click **Play** once to
unlock audio.

## Build

Requires the `tish` CLI (from the Tish repo).

```bash
npm run build    # tish build --target js src/main.tish -o dist/bundle.js
npm run serve    # static-serve the built folder (npx serve .)
npm test         # headless smoke test (TPL round-trip, streaming, skills, permissions)
```

JSX is built into `tish build --target js` and lowers to Lattish runtime calls — no separate JSX flag.
Click **Play** once to unlock audio.

## Layout

| Area | Tech |
|------|------|
| Transport, rack, mixer | DOM + CSS |
| Piano roll, scope | `<canvas>` |

**Reachability:** `src/main.tish` → `ui/App.tish` pulls in model, audio, schedule, generators, tpl (emit/apply/highlight), and Lattish. **Removed unused:** `hooks.tish` (dead shim), `tpl/Lexer.tish` (Parser inlines the same concerns).

## Co-DJ (WebSocket + actors)

**Order:** gateway → worker → browser.

### Quick start

1. **Tish CLI** with `ws` (and for worker: `http`, `fs`, `process`). From the **tish** repo: `cargo build -p tish --features full`.
2. **Terminal A — gateway:**  
   `npm run gateway`  
   (listens on **ws://127.0.0.1:35987**; clients connect and send first message `join` with `sessionId`).
3. **Terminal B — worker:**  
   `npm run agent`  
   (or `npm run agent -- --actor-id actor-1 --session default`)  
   - The worker buffers the host's streamed TPL and, on debounce, **snapshots it into one prompt, calls the LLM, and streams the real reply back** as `tpl.stream_chunk` → `tpl.block`. Set **`GRADIENT_MODEL_ACCESS_KEY`** (DO inference; `DO_MODEL` / `DO_INFERENCE_BASE` optional) to enable it. Without a key it falls back to a built-in demo patch (euclid hat / fm bass) so the loop still runs offline. Direct messages are answered the same way.
4. **Terminal C (or browser):** run the app (`npm run serve`, open **http://localhost:3456**).
5. In the app: **Co-DJ** panel → **Connect**. Session should be `default` (same as the worker). You should see other actors when the worker is running.
6. **Press Play.** The app sends **playing_start** and streams the current project as **tpl.line** to the gateway. The worker waits ~1.3s, then sends back **tpl.block** (and **tpl.stream_chunk**). The gateway forwards that to the browser; the app applies the block and you hear the new pattern.
7. **Direct test:** set **Direct→** to the worker's actor, type e.g. `euclid hi-hat`, click **Send test direct**. The worker replies with a **tpl.block**.

So: **gateway + worker + Connect + Play** (or **Send test direct**) is what makes the worker “work”.

**Token stream demo** (see [docs/TOKEN_STREAM_DEMO.md](docs/TOKEN_STREAM_DEMO.md)): `npm run token-demo` — gateway + bot stream.

Specs: [docs/WS_AND_AGENTS.md](docs/WS_AND_AGENTS.md), [docs/STREAM_PROTOCOL.md](docs/STREAM_PROTOCOL.md), [docs/AUTHOR_TAGGING.md](docs/AUTHOR_TAGGING.md), [docs/DJ_SKILLS.md](docs/DJ_SKILLS.md), [docs/CONTROLLER_PROFILES.md](docs/CONTROLLER_PROFILES.md).

**Web MIDI**: note-on on MIDI channels maps note % 8 → channel index for **temporary gain overlay** (hear without committing TPL).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — **start here:** overview, vision, subsystem map, end-to-end path  
- [docs/FL_STUDIO_GENERATORS.md](docs/FL_STUDIO_GENERATORS.md) — how this maps to FL-style channel instruments  
- [docs/GENERATORS.md](docs/GENERATORS.md) — adding a new generator module  
- [docs/schema/project-v2.json](docs/schema/project-v2.json) — project shape (v1 `waveform` auto-migrates)  
- [docs/TISH_JS_BUILTINS.md](docs/TISH_JS_BUILTINS.md) — `new` for JS (e.g. `AudioContext`, `Uint8Array`)  
- [docs/LATTISH.md](docs/LATTISH.md) — **Lattish** hooks + `h()` JSX-like DOM (no angle brackets)  
- [AGENTS.md](AGENTS.md) — agent editing contract  

## Upstream Tish changes

Deckard relies on Tish’s **`new`** support for the JS target (`new AudioContext()`, `new Uint8Array(n)`). Use a `tish` build that includes the `new` expression in the compiler.
