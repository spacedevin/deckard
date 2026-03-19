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

**Order:** hub → agent → browser.

1. `npm install` in `services/ws-hub` and `services/agent-worker` (once).
2. Terminal A: `npm run ws-hub` → hub on port **8765**.
3. Terminal B: `npm run agent -- --lane ai-a` — see [services/agent-worker/README.md](services/agent-worker/README.md): set **`GRADIENT_MODEL_ACCESS_KEY`** in `.env` for AI; without it, the agent still answers the human stream with a small demo pattern.
4. Open the app → **Co-DJ** → **Connect** (same session as the agent, usually `default`). The panel shows **Paired with ai-a** when an agent is online.
5. **Press Play** to stream the current project as TPL lines to the agent (`human_play` + throttled `tpl.line`). The agent buffers that text and replies with streamed TPL + a **`tpl.block`** on `ai-a`. **Stop** sends `human_stop`.
6. Optional: **Direct→** `ai-a` → **Send** for one-off natural-language edits (still works alongside streaming).

**Co-DJ Stream demo** (no hub): **Stream demo** randomly picks **DJ skills** from a unified registry ([`src/codj/StreamDemo.tish`](src/codj/StreamDemo.tish))—human stream may include `bpm` / tracks / steps / mix; agent stream stays within AI-allowed TPL. It then streams **tpl.stream_chunk** + one or two queued **`tpl.block`**s (second block ~one sequence later). **Play** to hear when the playhead reaches the target steps.

**Full-control sim**: streams the same patch as **TPL lines** in the TPL panel, then applies it via **`tpl.block`** on the **human** lane (full project power). **Stream demo** does the same for **ai-a** (lines → then queued blocks). No hub required to watch the line stream.

**Token stream demo** (see [docs/TOKEN_STREAM_DEMO.md](docs/TOKEN_STREAM_DEMO.md)): `npm run token-demo` — hub + bot stream.

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
