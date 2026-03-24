# Deckard

Minimal FL-style hybrid web DAW in **[Tish](https://github.com/tishlang/tish)** (JS target + JSX): step sequencer, piano roll (canvas), mixer (gain, pan, ADSR, mute/solo), per-channel waveform, master waveform scope, JSON import/export.

## Build

Requires the `tish` CLI (from the Tish repo):

```bash
tish compile --target js --jsx vdom src/main.tish -o dist/bundle.js
```

(`--jsx vdom` patches the DOM instead of replacing the whole tree, so the TPL editor, piano roll, and rack previews don’t flicker on every control tweak.)

Serve the folder (e.g. `npx serve .`) and open `index.html`. Click **Play** once to unlock audio.

## Layout

| Area | Tech |
|------|------|
| Transport, rack, mixer | DOM + CSS |
| Piano roll, scope | `<canvas>` |

**Reachability:** `src/main.tish` → `ui/App.tish` pulls in model, audio, schedule, generators, tpl (emit/apply/highlight), and Lattish. Optional counter demo: `src/lattish/examples/counter-main.tish` (`npm run build:counter`). **Removed unused:** `hooks.tish` (dead shim), `tpl/Lexer.tish` (Parser inlines the same concerns).

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
   - Tish worker responds to **direct** with demo TPL (euclid hat, bass/fm). For LLM responses, set `GRADIENT_MODEL_ACCESS_KEY` (see [services/agent-worker/README.md](services/agent-worker/README.md)).
4. **Terminal C (or browser):** run the app (`npm run serve`, open **http://localhost:3456**).
5. In the app: **Co-DJ** panel → **Connect**. Session should be `default` (same as the worker). You should see other actors when the worker is running.
6. **Press Play.** The app sends **playing_start** and streams the current project as **tpl.line** to the gateway. The worker waits ~1.3s, then sends back **tpl.block** (and **tpl.stream_chunk**). The gateway forwards that to the browser; the app applies the block and you hear the new pattern.
7. **Direct test:** set **Direct→** to the worker's actor, type e.g. `euclid hi-hat`, click **Send test direct**. The worker replies with a **tpl.block**.

So: **gateway + worker + Connect + Play** (or **Send test direct**) is what makes the worker “work”.

**Token stream demo** (see [docs/TOKEN_STREAM_DEMO.md](docs/TOKEN_STREAM_DEMO.md)): `npm run token-demo` — gateway + bot stream.

Specs: [docs/WS_AND_AGENTS.md](docs/WS_AND_AGENTS.md), [docs/STREAM_PROTOCOL.md](docs/STREAM_PROTOCOL.md), [docs/AUTHOR_TAGGING.md](docs/AUTHOR_TAGGING.md), [docs/DJ_SKILLS.md](docs/DJ_SKILLS.md), [docs/CONTROLLER_PROFILES.md](docs/CONTROLLER_PROFILES.md).

**Web MIDI**: note-on on MIDI channels maps note % 8 → channel index for **temporary gain overlay** (hear without committing TPL).

## Docs

- [docs/FL_STUDIO_GENERATORS.md](docs/FL_STUDIO_GENERATORS.md) — how this maps to FL-style channel instruments  
- [docs/GENERATORS.md](docs/GENERATORS.md) — adding a new generator module  
- [docs/schema/project-v2.json](docs/schema/project-v2.json) — project shape (v1 `waveform` auto-migrates)  
- [docs/TISH_JS_BUILTINS.md](docs/TISH_JS_BUILTINS.md) — `webAudioCreateContext` / `jsUint8Array`  
- [docs/LATTISH.md](docs/LATTISH.md) — **Lattish** hooks + `h()` JSX-like DOM (no angle brackets)  
- [AGENTS.md](AGENTS.md) — agent editing contract  

## Upstream Tish changes

This project adds JS intrinsics in `tish_compile_js` (`webAudioCreateContext`, `jsUint8Array`) — see `crates/tish_compile_js/src/js_intrinsics.rs`. Rebuild `tish` from a tree that includes those files.
