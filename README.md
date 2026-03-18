# tish-midi

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

**Reachability:** `src/main.tish` → `ui/App.tish` pulls in model, audio, schedule, generators, tpl (emit/apply/highlight), and Tishact. Optional counter demo: `src/tishact/examples/counter-main.tish` (`npm run build:counter`). **Removed unused:** `hooks.tish` (dead shim), `tpl/Lexer.tish` (Parser inlines the same concerns).

## Co-DJ (WebSocket + agents)

1. `npm install` in `services/ws-hub` and `services/agent-worker` (once).
2. Terminal A: `npm run ws-hub` → hub on port **8765**.
3. Terminal B: `npm run agent -- --lane ai-a` (optional demo worker; SQLite log + `tpl.block` on simulated `direct`).
4. Open the app → **Co-DJ** panel → Connect. Incoming **`tpl.block`** from agents merges into the project (lane ownership rules in [docs/CO_DJ_SPACE.md](docs/CO_DJ_SPACE.md)).

**Token stream demo** (see [docs/TOKEN_STREAM_DEMO.md](docs/TOKEN_STREAM_DEMO.md)): `npm run token-demo` (after `npm install` in `services/token-stream-demo`). Streams **`tpl.stream_chunk`** then commits **`tpl.block`** (`asap`). Connect Co-DJ, **Play**, watch the live stream panel; edit **Song** on `wsdemo_k1` / `wsdemo_h1` as human to override the bot.

Specs: [docs/WS_AND_AGENTS.md](docs/WS_AND_AGENTS.md), [docs/STREAM_PROTOCOL.md](docs/STREAM_PROTOCOL.md), [docs/AUTHOR_TAGGING.md](docs/AUTHOR_TAGGING.md), [docs/DJ_SKILLS.md](docs/DJ_SKILLS.md), [docs/CONTROLLER_PROFILES.md](docs/CONTROLLER_PROFILES.md).

**Web MIDI**: note-on on MIDI channels maps note % 8 → channel index for **temporary gain overlay** (hear without committing TPL).

## Docs

- [docs/FL_STUDIO_GENERATORS.md](docs/FL_STUDIO_GENERATORS.md) — how this maps to FL-style channel instruments  
- [docs/GENERATORS.md](docs/GENERATORS.md) — adding a new generator module  
- [docs/schema/project-v2.json](docs/schema/project-v2.json) — project shape (v1 `waveform` auto-migrates)  
- [docs/TISH_JS_BUILTINS.md](docs/TISH_JS_BUILTINS.md) — `webAudioCreateContext` / `jsUint8Array`  
- [docs/TISHACT.md](docs/TISHACT.md) — **Tishact** hooks + `h()` JSX-like DOM (no angle brackets)  
- [AGENTS.md](AGENTS.md) — agent editing contract  

## Upstream Tish changes

This project adds JS intrinsics in `tish_compile_js` (`webAudioCreateContext`, `jsUint8Array`) — see `crates/tish_compile_js/src/js_intrinsics.rs`. Rebuild `tish` from a tree that includes those files.
