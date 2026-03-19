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

**Order:** gateway → agent → browser.

### Quick start: real agent (not just demos)

1. **Tish CLI** with `ws` (and for agent: `http`, `fs`, `process`). From the **tish** repo: `cargo build -p tish --features full`.
2. **Terminal A — gateway:**  
   `npm run gateway`  
   (listens on **ws://127.0.0.1:8765**; clients connect and send first message `join` with `sessionId`).
3. **Terminal B — agent:**  
   `npm run agent`  
   (or `npm run agent -- --lane ai-a --session default`)  
   - Tish agent responds to **direct** with demo TPL (euclid hat, bass/fm). For **real LLM** responses, use the Node agent (see [services/agent-worker/README.md](services/agent-worker/README.md)) until async/LLM is wired in Tish.
4. **Terminal C (or browser):** run the app (`npm run serve`, open **http://localhost:3456**).
5. In the app: **Co-DJ** panel → **Connect**. Session should be `default` (same as the agent). You should see **Paired lane ai-a** (or “No agent” if the agent isn’t running).
6. **Press Play.** The app sends **human_play** and streams the current project as **tpl.line** to the gateway. The agent (Tish or Node) it, waits ~1.3s, then sends back **tpl.block** (and **tpl.stream_chunk**) on lane **ai-a**. the gateway forwards that to the browser; the app applies the block and you hear the new pattern.
7. **Direct test:** set **Direct→** to `ai-a`, type e.g. `euclid hi-hat`, click **Send test direct**. The agent replies with a **tpl.block** for that lane.

So: **gateway + agent + Connect + Play** (or **Send test direct**) is what makes the agent “do stuff for reals”; the in-app **Stream demo** and **Full-control sim** are local simulations with no gateway/agent.

**Co-DJ Stream demo** (no hub): **Stream demo** randomly picks **DJ skills** from a unified registry ([`src/codj/StreamDemo.tish`](src/codj/StreamDemo.tish))—human stream may include `bpm` / tracks / steps / mix; agent stream stays within AI-allowed TPL. It then streams **tpl.stream_chunk** + one or two queued **`tpl.block`**s (second block ~one sequence later). **Play** to hear when the playhead reaches the target steps.

**Full-control sim**: streams the same patch as **TPL lines** in the TPL panel, then applies it via **`tpl.block`** on the **human** lane (full project power). **Stream demo** does the same for **ai-a** (lines → then queued blocks). No hub required to watch the line stream.

**Token stream demo** (see [docs/TOKEN_STREAM_DEMO.md](docs/TOKEN_STREAM_DEMO.md)): `npm run token-demo` — gateway + bot stream.

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
